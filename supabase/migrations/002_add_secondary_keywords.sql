-- Add secondary_keywords column to articles table
alter table public.articles add column if not exists secondary_keywords text[];
