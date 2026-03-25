-- Add platform-specific image prompt columns to article_content
alter table public.article_content add column if not exists image_prompt_pinterest text;
alter table public.article_content add column if not exists image_prompt_social text;
