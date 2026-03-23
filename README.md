# DirectHR — Submit CV

A modern, production-ready CV submission page for [DirectHR](https://directhr.cn).  
Candidates upload their résumé; the system stores it and generates a semantic embedding so an AI agent can later rank candidates against any job description.

---

## ✨ Features

| Feature | Detail |
|---|---|
| **Modern form UI** | Name, e-mail, phone, position, experience + drag-and-drop file upload |
| **File storage** | CV files (PDF / DOC / DOCX, ≤ 10 MB) stored in a **private** Supabase Storage bucket |
| **Text extraction** | PDF text is extracted server-side with `pdf-parse` |
| **Vector embeddings** | `text-embedding-004` (Google Gemini, free tier) turns each CV into a 768-dim vector |
| **Semantic search** | `match_candidates()` SQL function lets AI agents find top-N matching candidates for any job description |
| **Signed URLs** | A dedicated endpoint (`GET /api/cv-url?path=…`) generates time-limited download links — no public exposure |
| **Graceful degradation** | If `GEMINI_API_KEY` is absent, CVs are still stored—just without embeddings |

---

## 🏗️ Architecture

```
Browser  →  POST /api/submit-cv  →  Supabase Storage (private bucket, raw files)
                                 →  Postgres / pgvector  (metadata + embeddings)
                                 ←  Google Gemini Embeddings API (free tier)

Admin    →  GET /api/cv-url?path=<storagePath>
                                 →  Supabase Storage createSignedUrl()
                                 ←  time-limited signed download URL
```

**Why Supabase + pgvector?**

- **One service** covers both file storage and the vector database — no extra SaaS to manage.  
- `pgvector`'s IVFFlat index allows sub-millisecond approximate nearest-neighbour queries at scale.  
- AI agents call the `match_candidates(embedding, threshold, k)` RPC directly over the Supabase REST / PostgREST API — no custom backend required.

**Why Gemini `text-embedding-004`?**

- **Completely free** on the AI Studio tier — 1 500 requests/minute, no credit card.
- Produces 768-dimensional vectors; excellent quality for multilingual CV text.
- Drop-in replacement for OpenAI embeddings in pgvector.

---

## 🔑 Netlify Environment Variables

When you deploy to Netlify, go to **Site settings → Environment variables** and add these variables.  
The names must be entered **exactly** as shown (they are case-sensitive).

| Variable name | Required? | Where to find the value |
|---|---|---|
| `SUPABASE_URL` | ✅ Required | Supabase dashboard → your project → **Settings → API** → **Project URL** (e.g. `https://xxxxxxxxxxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Required | Same page → **service_role** key (labelled "secret") — **never expose this in the browser** |
| `GEMINI_API_KEY` | ⚙️ Optional* | <https://aistudio.google.com/apikey> → **Create API key** (free, no credit card) |
| `SIGNED_URL_EXPIRY_SECONDS` | ⚙️ Optional | Lifetime of signed CV download links in seconds. Defaults to **300** (5 minutes). |

> \* If `GEMINI_API_KEY` is omitted, CVs are still stored and fully searchable by text — only the AI semantic-similarity ranking is disabled.

---

## 🚀 Quick Start

### 1 — Clone and install

```bash
git clone https://github.com/labrynna/submit-cv.git
cd submit-cv
npm install
```

### 2 — Set up Supabase

1. Create a free project at <https://supabase.com>.
2. In the **SQL Editor**, run the migration:

   ```sql
   -- paste contents of supabase/schema.sql
   ```

3. Create a Storage bucket named **`cvs`**:
   - Dashboard → Storage → New bucket → Name: `cvs`
   - Keep **Public** access **off** (private bucket — the app uses signed URLs to access files).

   > **Existing public bucket?** Run the following SQL migration to allow `cv_url` to be `NULL` (required for private bucket mode):
   > ```sql
   > ALTER TABLE candidates ALTER COLUMN cv_url DROP NOT NULL;
   > ```

### 3 — Get a Gemini API key (free)

1. Go to <https://aistudio.google.com/apikey>
2. Click **Create API key** — no credit card required.

### 4 — Configure environment variables

```bash
cp .env.example .env.local
# edit .env.local and fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
```

### 5 — Run locally

```bash
npm run dev        # http://localhost:3000
```

### 6 — Deploy to Netlify

1. Push this repository to GitHub.
2. In the [Netlify dashboard](https://app.netlify.com), click **Add new site → Import an existing project** and connect the repo.  
   Netlify auto-detects Next.js and installs the Essential Next.js plugin.
3. Under **Site settings → Environment variables**, add:

   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | your Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service-role key |
   | `GEMINI_API_KEY` | your Gemini API key from AI Studio |

4. Trigger a deploy — done! 🎉

> **Note:** The `netlify.toml` at the repo root is pre-configured with the correct build command and publish directory.

---

## 🤖 Using the AI Knowledge Base

An AI agent (LangChain, LlamaIndex, Vercel AI SDK, etc.) can find matching candidates by:

```ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// 1. Embed the job description
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
const { embedding } = await model.embedContent(
  "We are hiring a senior React engineer with 5+ years experience..."
);

// 2. Query Supabase for the top 10 candidates
const { data } = await supabase.rpc("match_candidates", {
  query_embedding: embedding.values,
  match_threshold: 0.72,
  match_count: 10,
});

console.log(data); // [{ name, email, cv_storage_path, similarity, … }, …]
```

Because the bucket is **private**, `cv_url` in the database is `null`.  To retrieve a CV file, generate a signed URL with:

```ts
// GET /api/cv-url?path=<cv_storage_path>
const res = await fetch(`/api/cv-url?path=${encodeURIComponent(candidate.cv_storage_path)}`);
const { signedUrl, expiresIn } = await res.json();
// signedUrl is valid for `expiresIn` seconds (default 300 s / 5 min)
```

The `cv_storage_path` field in the `candidates` table is the object key to pass to `GET /api/cv-url`.

---

## 📁 Project Structure

```
src/
  app/
    page.tsx              # CV submission form (client component)
    layout.tsx            # Root layout with metadata
    globals.css           # Tailwind + custom CSS variables
    api/
      submit-cv/
        route.ts          # POST handler: validate → upload → embed → store
      cv-url/
        route.ts          # GET handler: generate a signed download URL for a CV
  lib/
    supabase.ts           # Supabase admin client + constants (CV_BUCKET, CV_SIGNED_URL_EXPIRY)
    embeddings.ts         # Gemini embedding helper
supabase/
  schema.sql              # pgvector schema + match_candidates() RPC
netlify.toml              # Netlify build & deploy config
.env.example              # Environment variable template
```

---

## 🔒 Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are only used server-side; they are never sent to the browser.
- Netlify environment variables are encrypted at rest and injected at build/runtime — they are not exposed in the client bundle.
- File type and size are validated both client-side and server-side.
- E-mail format is validated with a regex before any DB write.
- A unique index on `(email, cv_storage_path)` prevents duplicate uploads.
- The `cvs` Storage bucket is **private** — uploaded files are not publicly accessible via URL.
- `GET /api/cv-url` generates time-limited signed URLs (default 5 min) and must only be called from your trusted admin layer, not exposed to candidates or the public.
- Signed URL expiry can be tuned via the `SIGNED_URL_EXPIRY_SECONDS` environment variable.

---

## 📜 License

MIT
