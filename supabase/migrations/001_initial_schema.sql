-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- brands (multi-brand ready, single brand UI for now)
create table public.brands (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text unique not null,
  logo_url    text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- brand_settings (all onboarding config lives here)
create table public.brand_settings (
  id                        uuid primary key default uuid_generate_v4(),
  brand_id                  uuid references public.brands(id) on delete cascade unique,
  -- Brand identity
  tone_and_voice            text,
  target_audience           text,
  brand_story               text,
  unique_selling_points     text,
  -- Content rules
  content_guidelines        text,
  things_to_always_include  text,
  things_to_never_include   text,
  -- Defaults
  default_word_count_min    integer default 800,
  default_word_count_max    integer default 1200,
  -- Taxonomy
  content_categories        text[],
  content_tags              text[],
  -- SEO
  site_name                 text,
  site_url                  text,
  meta_description_style    text,
  -- Image AI prompts
  image_prompt_style        text,
  -- WordPress
  wp_site_url               text,
  wp_username               text,
  wp_app_password           text,
  -- Status
  onboarding_complete       boolean default false,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

-- articles (one record per creation session)
create table public.articles (
  id              uuid primary key default uuid_generate_v4(),
  brand_id        uuid references public.brands(id) on delete cascade,
  focus_keyword   text not null,
  user_notes      text,
  -- Personal story inputs
  story_provided  boolean default false,
  story_content   text,
  story_placement text,
  status          text default 'draft' check (status in ('draft', 'archived', 'published')),
  wp_post_id      integer,
  wp_post_url     text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- article_angles (5 angles generated per article session)
create table public.article_angles (
  id              uuid primary key default uuid_generate_v4(),
  article_id      uuid references public.articles(id) on delete cascade,
  angle_number    integer not null,
  title           text not null,
  description     text not null,
  article_type    text not null,
  selected        boolean default false,
  redo_round      integer default 1,
  created_at      timestamptz default now()
);

-- article_content (the generated article and all metadata)
create table public.article_content (
  id                  uuid primary key default uuid_generate_v4(),
  article_id          uuid references public.articles(id) on delete cascade,
  angle_id            uuid references public.article_angles(id),
  title               text,
  slug                text,
  body                text,
  meta_title          text,
  meta_description    text,
  category            text,
  tags                text[],
  image_prompt        text,
  word_count          integer,
  version             integer default 1,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- RLS: Enable row level security on all tables
alter table public.brands enable row level security;
alter table public.brand_settings enable row level security;
alter table public.articles enable row level security;
alter table public.article_angles enable row level security;
alter table public.article_content enable row level security;

-- Policy: authenticated users can do everything (single-user app)
create policy "Authenticated full access" on public.brands for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on public.brand_settings for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on public.articles for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on public.article_angles for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on public.article_content for all using (auth.role() = 'authenticated');
