-- Run once in Supabase → SQL Editor

create table if not exists page_likes (
  id bigint generated always as identity primary key,
  name text not null,
  comment text not null,
  created_at timestamptz not null default now()
);

alter table page_likes enable row level security;

create policy "Public read page likes"
  on page_likes for select
  using (true);

create policy "Public insert page likes"
  on page_likes for insert
  with check (true);

create index if not exists page_likes_created_at_idx
  on page_likes (created_at desc);
