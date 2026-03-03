create extension if not exists pgcrypto;

create table if not exists hadith (
  id uuid primary key default gen_random_uuid(),
  collection_slug text not null,
  collection_name text not null,
  book_number integer,
  book_name text,
  chapter_number integer,
  chapter_title text,
  hadith_number integer,
  hadith_key text,
  arabic_text text,
  english_text text,
  topic_tags text[] default '{}',
  reference text,
  created_at timestamptz not null default now(),
  unique (collection_slug, hadith_number)
);

create table if not exists hadith_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hadith_id uuid not null references hadith(id) on delete cascade,
  saved_at timestamptz not null default now(),
  unique (user_id, hadith_id)
);

create table if not exists hadith_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hadith_id uuid not null references hadith(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists hadith_reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hadith_id uuid not null references hadith(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create index if not exists hadith_collection_idx on hadith (collection_slug, hadith_number);
create index if not exists hadith_saves_user_idx on hadith_saves (user_id, saved_at desc);
create index if not exists hadith_notes_user_idx on hadith_notes (user_id, created_at desc);
create index if not exists hadith_reads_user_idx on hadith_reads (user_id, viewed_at desc);

alter table hadith enable row level security;
alter table hadith_saves enable row level security;
alter table hadith_notes enable row level security;
alter table hadith_reads enable row level security;

-- Hadith records are readable by authenticated users.
create policy if not exists "hadith_select_authenticated"
  on hadith
  for select
  to authenticated
  using (true);

-- Writes to hadith are restricted to service-role workflows.
create policy if not exists "hadith_insert_service_role"
  on hadith
  for insert
  to service_role
  with check (true);

create policy if not exists "hadith_update_service_role"
  on hadith
  for update
  to service_role
  using (true)
  with check (true);

create policy if not exists "hadith_delete_service_role"
  on hadith
  for delete
  to service_role
  using (true);

create policy if not exists "hadith_saves_select_own"
  on hadith_saves
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy if not exists "hadith_saves_insert_own"
  on hadith_saves
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy if not exists "hadith_saves_delete_own"
  on hadith_saves
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy if not exists "hadith_notes_select_own"
  on hadith_notes
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy if not exists "hadith_notes_insert_own"
  on hadith_notes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy if not exists "hadith_notes_delete_own"
  on hadith_notes
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy if not exists "hadith_reads_select_own"
  on hadith_reads
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy if not exists "hadith_reads_insert_own"
  on hadith_reads
  for insert
  to authenticated
  with check (auth.uid() = user_id);
