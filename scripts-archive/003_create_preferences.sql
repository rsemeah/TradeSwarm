-- Create user preferences table
create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  safety_mode text default 'training_wheels' check (safety_mode in ('training_wheels', 'guardrails', 'full_auto')),
  max_position_size numeric default 500,
  max_daily_loss numeric default 200,
  notifications_enabled boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id)
);

-- Enable RLS
alter table public.user_preferences enable row level security;

-- RLS policies
create policy "preferences_select_own" on public.user_preferences for select using (auth.uid() = user_id);
create policy "preferences_insert_own" on public.user_preferences for insert with check (auth.uid() = user_id);
create policy "preferences_update_own" on public.user_preferences for update using (auth.uid() = user_id);
create policy "preferences_delete_own" on public.user_preferences for delete using (auth.uid() = user_id);

-- Auto-create preferences on profile creation
create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_profile_created on public.profiles;

create trigger on_profile_created
  after insert on public.profiles
  for each row
  execute function public.handle_new_profile();
