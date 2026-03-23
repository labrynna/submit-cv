import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, CV_BUCKET, CV_TABLE } from "@/lib/supabase";
import { createEmbedding } from "@/lib/embeddings";

/** Maximum allowed file size: 10 MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Accepted MIME types */
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // ── 1. Validate required text fields ──────────────────────────────────
    const name = (formData.get("name") as string | null)?.trim();
    const email = (formData.get("email") as string | null)?.trim();
    const phone = (formData.get("phone") as string | null)?.trim();
    const position = (formData.get("position") as string | null)?.trim();
    const experience = (formData.get("experience") as string | null)?.trim();
    const file = formData.get("cv") as File | null;

    if (!name || !email || !file) {
      return NextResponse.json(
        { error: "Name, email and CV file are required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // ── 2. Validate file ──────────────────────────────────────────────────
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must not exceed 10 MB." },
        { status: 400 }
      );
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF or Word files are supported (.pdf / .doc / .docx)." },
        { status: 400 }
      );
    }

    // ── 3. Upload raw file to Supabase Storage ────────────────────────────
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const safeEmail = email.replace(/[^a-zA-Z0-9]/g, "_");
    const ext = file.name.split(".").pop() ?? "pdf";
    const storagePath = `${safeEmail}_${timestamp}.${ext}`;

    const supabase = (() => {
      try {
        return getSupabaseAdmin();
      } catch (configErr) {
        throw new Error(
          `[config] Failed to initialize Supabase client: ${configErr instanceof Error ? configErr.message : String(configErr)}`
        );
      }
    })();

    const { error: storageError } = await supabase.storage
      .from(CV_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      console.error("[storage] Upload error:", storageError);
      return NextResponse.json(
        { error: `[storage] File upload failed: ${storageError.message}` },
        { status: 500 }
      );
    }

    // Get public URL for the stored file
    const {
      data: { publicUrl },
    } = supabase.storage.from(CV_BUCKET).getPublicUrl(storagePath);

    // ── 4. Extract text from PDF (best-effort) ────────────────────────────
    let cvText = `Name: ${name}\nEmail: ${email}\n`;
    if (phone) cvText += `Phone: ${phone}\n`;
    if (position) cvText += `Desired Position: ${position}\n`;
    if (experience) cvText += `Work Experience: ${experience}\n`;

    if (file.type === "application/pdf") {
      let parser;
      try {
        const { PDFParse } = await import("pdf-parse");
        parser = new PDFParse({ data: fileBuffer });
        const result = await parser.getText();
        if (result.text?.trim()) {
          cvText += `\n--- CV Body ---\n${result.text}`;
        }
      } catch (parseErr) {
        // Non-fatal: proceed without extracted text
        console.warn("[pdf-parse] Text extraction warning:", parseErr);
      } finally {
        await parser?.destroy();
      }
    }

    // ── 5. Generate embedding for semantic search ─────────────────────────
    let embedding: number[] | null = null;
    if (process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY) {
      try {
        embedding = await createEmbedding(cvText);
      } catch (embErr) {
        // Non-fatal: store candidate without embedding
        console.warn("[embedding] Generation warning:", embErr);
      }
    }

    // ── 6. Store candidate metadata + embedding in Postgres/pgvector ──────
    const candidateRecord: Record<string, unknown> = {
      name,
      email,
      phone: phone ?? null,
      position: position ?? null,
      experience: experience ?? null,
      cv_url: publicUrl,
      cv_storage_path: storagePath,
      cv_text: cvText,
    };

    if (embedding) {
      candidateRecord.embedding = JSON.stringify(embedding);
    }

    const { error: dbError } = await supabase
      .from(CV_TABLE)
      .insert(candidateRecord);

    if (dbError) {
      console.error("[database] Insert error:", dbError);
      // File is already stored; treat DB failure as a warning
    }

    return NextResponse.json({
      success: true,
      message: "CV submitted successfully! We will be in touch soon.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Unexpected error in /api/submit-cv:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
