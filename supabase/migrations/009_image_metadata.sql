-- Add image SEO metadata columns to article_content
-- Each image type gets: filename, alt_text, image_meta_description

-- Blog featured image
alter table public.article_content add column if not exists image_filename text;
alter table public.article_content add column if not exists image_alt_text text;
alter table public.article_content add column if not exists image_meta_description text;

-- Pinterest image
alter table public.article_content add column if not exists image_pinterest_filename text;
alter table public.article_content add column if not exists image_pinterest_alt_text text;
alter table public.article_content add column if not exists image_pinterest_meta_description text;

-- Social (Instagram/TikTok) image
alter table public.article_content add column if not exists image_social_filename text;
alter table public.article_content add column if not exists image_social_alt_text text;
alter table public.article_content add column if not exists image_social_meta_description text;
