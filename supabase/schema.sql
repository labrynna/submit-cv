-- Enable the pgvector extension for semantic search
create extension if not exists vector;

-- Candidates table: stores CV metadata and embedding vectors
create table if not exists candidates (
  id            bigserial primary key,
  name          text not null,
  email         text not null,
  phone         text,
  position      text,
  experience    text,
  cv_url        text not null,
  cv_storage_path text not null,
  cv_text       text,                          -- extracted plain-text from the CV
  embedding     vector(768),                   -- Gemini text-embedding-004
  submitted_at  timestamptz not null default now()
);

-- Index for fast approximate nearest-neighbour search (cosine distance)
create index if not exists candidates_embedding_idx
  on candidates
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Unique constraint to prevent duplicate submissions
create unique index if not exists candidates_email_path_idx
  on candidates (email, cv_storage_path);

-- ─── Helper RPC: semantic search for AI agents ────────────────────────────────
--
-- Usage (from your AI agent / API):
--   select * from match_candidates(query_embedding, match_threshold, match_count);
--
-- Example:
--   select * from match_candidates(
--     '[0.01, -0.02, …]'::vector,   -- embedding of the job description
--     0.75,                          -- minimum cosine similarity
--     10                             -- top-k candidates to return
--   );
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function match_candidates(
  query_embedding  vector(768),
  match_threshold  float    default 0.70,
  match_count      int      default 10
)
returns table (
  id            bigint,
  name          text,
  email         text,
  phone         text,
  position      text,
  experience    text,
  cv_url        text,
  cv_text       text,
  submitted_at  timestamptz,
  similarity    float
)
language sql stable
as $$
  select
    id,
    name,
    email,
    phone,
    position,
    experience,
    cv_url,
    cv_text,
    submitted_at,
    1 - (embedding <=> query_embedding) as similarity
  from candidates
  where embedding is not null
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
