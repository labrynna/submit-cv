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
| **Vector embeddings** | `text-embedding-3-small` (OpenAI) turns each CV into a 1 536-dim vector |
| **Semantic search** | `match_candidates()` SQL function lets AI agents find top-N matching candidates for any job description |
| **Graceful degradation** | If `OPENAI_API_KEY` is absent, CVs are still stored—just without embeddings |

---

## 🏗️ Architecture

```
Browser  →  POST /api/submit-cv  →  Supabase Storage  (raw files)
                                 →  Postgres / pgvector  (metadata + embeddings)
                                 ←  OpenAI Embeddings API
```

**Why Supabase + pgvector?**

- **One service** covers both file storage and the vector database — no extra SaaS to manage.  
- `pgvector`'s IVFFlat index allows sub-millisecond approximate nearest-neighbour queries at scale.  
- AI agents call the `match_candidates(embedding, threshold, k)` RPC directly over the Supabase REST / PostgREST API — no custom backend required.

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

### 3 — Configure environment variables

```bash
cp .env.example .env.local
# edit .env.local and fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
```

### 4 — Run locally

```bash
npm run dev        # http://localhost:3000
```

### 5 — Deploy

Push to Vercel / any Node.js host.  
Set the three environment variables in your hosting dashboard.

---

## 🤖 Using the AI Knowledge Base

An AI agent (LangChain, LlamaIndex, Vercel AI SDK, etc.) can find matching candidates by:

```ts
// 1. Embed the job description
const jdEmbedding = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: "We are hiring a senior React engineer with 5+ years experience...",
});

// 2. Query Supabase for the top 10 candidates
const { data } = await supabase.rpc("match_candidates", {
  query_embedding: jdEmbedding.data[0].embedding,
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
    embeddings.ts         # OpenAI embedding helper
supabase/
  schema.sql              # pgvector schema + match_candidates() RPC
.env.example              # Environment variable template
```

---

## 🔒 Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` is only used server-side; it is never sent to the browser.
- File type and size are validated both client-side and server-side.
- E-mail format is validated with a regex before any DB write.
- A unique index on `(email, cv_storage_path)` prevents duplicate uploads.

---

## 📜 License

MIT
