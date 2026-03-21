# DirectHR — Submit CV

A modern, production-ready CV submission page for [DirectHR](https://directhr.cn).  
Candidates upload their résumé; the system stores it and generates a semantic embedding so an AI agent can later rank candidates against any job description.

---

## ✨ Features

| Feature | Detail |
|---|---|
| **Modern form UI** | Name, e-mail, phone, position, experience + drag-and-drop file upload |
| **File storage** | CV files (PDF / DOC / DOCX, ≤ 10 MB) stored in **Supabase Storage** |
| **Text extraction** | PDF text is extracted server-side with `pdf-parse` |
| **Vector embeddings** | `text-embedding-004` (Google Gemini, free tier) turns each CV into a 768-dim vector |
| **Semantic search** | `match_candidates()` SQL function lets AI agents find top-N matching candidates for any job description |
| **Graceful degradation** | If `GEMINI_API_KEY` is absent, CVs are still stored—just without embeddings |

---

## 🏗️ Architecture

```
Browser  →  POST /api/submit-cv  →  Supabase Storage  (raw files)
                                 →  Postgres / pgvector  (metadata + embeddings)
                                 ←  Google Gemini Embeddings API (free tier)
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

When you deploy to Netlify, go to **Site settings → Environment variables** and add these three variables.  
The names must be entered **exactly** as shown (they are case-sensitive).

| Variable name | Required? | Where to find the value |
|---|---|---|
| `SUPABASE_URL` | ✅ Required | Supabase dashboard → your project → **Settings → API** → **Project URL** (e.g. `https://xxxxxxxxxxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Required | Same page → **service_role** key (labelled "secret") — **never expose this in the browser** |
| `GEMINI_API_KEY` | ⚙️ Optional* | <https://aistudio.google.com/apikey> → **Create API key** (free, no credit card) |

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
   - Set **Public** access *on* (so URLs in the DB are directly accessible) or keep it private and use signed URLs.

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

console.log(data); // [{ name, email, cv_url, similarity, … }, …]
```

The `cv_url` field points directly to the stored file in Supabase Storage for full-document retrieval.

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
  lib/
    supabase.ts           # Supabase admin client
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

---

## 📜 License

MIT
