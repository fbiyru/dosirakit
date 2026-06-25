-- Merge things_to_always_include and things_to_never_include into content_guidelines
-- Concatenate existing data before dropping columns

update public.brand_settings
set content_guidelines = concat_ws(
  E'\n\n',
  nullif(content_guidelines, ''),
  case when nullif(things_to_always_include, '') is not null
    then 'ALWAYS INCLUDE:' || E'\n' || things_to_always_include
    else null
  end,
  case when nullif(things_to_never_include, '') is not null
    then 'NEVER INCLUDE:' || E'\n' || things_to_never_include
    else null
  end
)
where things_to_always_include is not null
   or things_to_never_include is not null;

alter table public.brand_settings drop column if exists things_to_always_include;
alter table public.brand_settings drop column if exists things_to_never_include;
