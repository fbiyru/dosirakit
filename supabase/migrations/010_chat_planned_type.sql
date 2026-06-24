-- Add 'chat_planned' to opportunity_type constraint
alter table public.opportunities drop constraint if exists opportunities_opportunity_type_check;
alter table public.opportunities add constraint opportunities_opportunity_type_check
  check (opportunity_type in ('striking_distance', 'competitor_gap', 'unowned', 'chat_planned'));

-- Add 'chat_planned' to source_type constraint
alter table public.articles drop constraint if exists articles_source_type_check;
alter table public.articles add constraint articles_source_type_check
  check (source_type in ('generated', 'rewritten', 'chat_planned'));
