-- SEO Pipeline Expansion
-- Adds four new tables to support the upstream content pipeline:
-- site_profiles, competitors, opportunities, briefs

-- site_profiles: one row per brand. Stores Firecrawl-derived site map and scraped summary.
create table public.site_profiles (
  id              uuid primary key default uuid_generate_v4(),
  brand_id        uuid references public.brands(id) on delete cascade,
  site_url        text not null,
  url_map         jsonb,
  site_summary    text,
  domain_metrics  jsonb,
  last_scraped_at timestamptz default now(),
  created_at      timestamptz default now()
);

-- competitors: 2-3 competitor URLs per brand, entered manually by the user.
create table public.competitors (
  id          uuid primary key default uuid_generate_v4(),
  brand_id    uuid references public.brands(id) on delete cascade,
  name        text,
  url         text not null,
  created_at  timestamptz default now()
);

-- opportunities: keyword opportunities returned from DataForSEO.
create table public.opportunities (
  id                 uuid primary key default uuid_generate_v4(),
  brand_id           uuid references public.brands(id) on delete cascade,
  keyword            text not null,
  volume             integer,
  kd                 integer,
  traffic_potential  integer,
  opportunity_type   text check (opportunity_type in ('striking_distance', 'competitor_gap', 'unowned')),
  status             text default 'new' check (status in ('new', 'briefed', 'written', 'published')),
  wordpress_url      text,
  created_at         timestamptz default now()
);

-- briefs: Claude-generated content brief per opportunity.
create table public.briefs (
  id              uuid primary key default uuid_generate_v4(),
  opportunity_id  uuid references public.opportunities(id) on delete cascade,
  brand_id        uuid references public.brands(id) on delete cascade,
  brief_content   jsonb not null,
  created_at      timestamptz default now()
);

-- Enable row level security on all new tables.
alter table public.site_profiles enable row level security;
alter table public.competitors enable row level security;
alter table public.opportunities enable row level security;
alter table public.briefs enable row level security;

-- Policy: authenticated users can do everything (single-user app, matches existing pattern).
create policy "Authenticated full access" on public.site_profiles for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on public.competitors for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on public.opportunities for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on public.briefs for all using (auth.role() = 'authenticated');

-- Helpful indexes for common lookups.
create index if not exists site_profiles_brand_id_idx on public.site_profiles(brand_id);
create index if not exists competitors_brand_id_idx on public.competitors(brand_id);
create index if not exists opportunities_brand_id_idx on public.opportunities(brand_id);
create index if not exists opportunities_status_idx on public.opportunities(status);
create index if not exists briefs_opportunity_id_idx on public.briefs(opportunity_id);
create index if not exists briefs_brand_id_idx on public.briefs(brand_id);
