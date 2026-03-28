-- Add generate_image_prompts toggle to articles table
alter table public.articles add column if not exists generate_image_prompts boolean default true;
