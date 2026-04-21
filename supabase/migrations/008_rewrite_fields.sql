alter table public.articles
  add column if not exists source_type text default 'generated'
    check (source_type in ('generated', 'rewritten')),
  add column if not exists original_content text,
  add column if not exists rewrite_source text;
