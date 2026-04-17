create table public.keyword_exclusions (
  id          uuid primary key default uuid_generate_v4(),
  brand_id    uuid references public.brands(id) on delete cascade,
  keyword     text not null,
  created_at  timestamptz default now(),
  unique(brand_id, keyword)
);

alter table public.keyword_exclusions enable row level security;
create policy "Authenticated full access" on public.keyword_exclusions for all using (auth.role() = 'authenticated');
create index if not exists keyword_exclusions_brand_id_idx on public.keyword_exclusions(brand_id);
