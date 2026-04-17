-- Link articles back to the opportunity that seeded them.
-- Nullable — most articles are created ad-hoc and have no linked opportunity.
alter table public.articles
  add column if not exists opportunity_id uuid references public.opportunities(id) on delete set null;

create index if not exists articles_opportunity_id_idx on public.articles(opportunity_id);
