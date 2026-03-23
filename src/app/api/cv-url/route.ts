import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, CV_BUCKET, CV_SIGNED_URL_EXPIRY } from "@/lib/supabase";

/**
 * GET /api/cv-url?path=<storagePath>
 *
 * Generates a time-limited signed download URL for a CV stored in the private
 * Supabase Storage bucket.  The URL is valid for CV_SIGNED_URL_EXPIRY seconds
 * (default 300 s / 5 min; override with the SIGNED_URL_EXPIRY_SECONDS env var).
 *
 * ⚠️  SECURITY: This route uses the service-role key and must only be called
 * from your trusted admin layer.  Add authentication / authorization checks
 * (e.g. session validation, API key header) before exposing it to any client.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storagePath = searchParams.get("path");

    if (!storagePath || storagePath.trim() === "") {
      return NextResponse.json(
        { error: "Missing required query parameter: path" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.storage
      .from(CV_BUCKET)
      .createSignedUrl(storagePath, CV_SIGNED_URL_EXPIRY);

    if (error || !data?.signedUrl) {
      console.error("[storage] Signed URL error:", error);
      return NextResponse.json(
        { error: `Failed to generate signed URL: ${error?.message ?? "unknown error"}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      expiresIn: CV_SIGNED_URL_EXPIRY,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Unexpected error in /api/cv-url:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
