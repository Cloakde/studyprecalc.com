-- PrecalcApp Supabase schema.
-- Run this in the Supabase SQL Editor for the project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id text primary key,
  question_set_version text not null,
  content jsonb not null,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id text not null,
  question_type text not null check (question_type in ('mcq', 'frq')),
  started_at timestamptz not null,
  submitted_at timestamptz not null,
  updated_at timestamptz not null default now(),
  response jsonb not null,
  score numeric not null check (score >= 0),
  max_score numeric not null check (max_score > 0),
  is_correct boolean,
  time_spent_seconds integer check (time_spent_seconds is null or time_spent_seconds >= 0),
  created_at timestamptz not null default now(),
  check (score <= max_score)
);

create table if not exists public.session_results (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_set_version text not null,
  started_at timestamptz not null,
  submitted_at timestamptz not null,
  updated_at timestamptz not null default now(),
  duration_seconds integer not null check (duration_seconds >= 0),
  time_limit_seconds integer check (time_limit_seconds is null or time_limit_seconds >= 0),
  filters jsonb not null,
  planned_question_count integer not null check (planned_question_count >= 0),
  answered_question_count integer not null check (answered_question_count >= 0),
  score numeric not null check (score >= 0),
  max_score numeric not null check (max_score >= 0),
  percent integer not null check (percent >= 0 and percent <= 100),
  pending_manual_score_count integer not null check (pending_manual_score_count >= 0),
  missed_question_ids text[] not null default '{}',
  marked_question_ids text[] not null default '{}',
  question_results jsonb not null,
  created_at timestamptz not null default now(),
  check (score <= max_score),
  check (answered_question_count <= planned_question_count)
);

create index if not exists attempts_user_submitted_idx
  on public.attempts(user_id, submitted_at desc);

create index if not exists attempts_user_question_idx
  on public.attempts(user_id, question_id);

create index if not exists session_results_user_submitted_idx
  on public.session_results(user_id, submitted_at desc);

create index if not exists questions_published_idx
  on public.questions(is_published, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists questions_set_updated_at on public.questions;
create trigger questions_set_updated_at
before update on public.questions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1), 'Student')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.session_results enable row level security;

drop policy if exists "Profiles can read themselves" on public.profiles;
create policy "Profiles can read themselves"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "Profiles can update their display name" on public.profiles;
create policy "Profiles can update their display name"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (
  (id = auth.uid() and role = 'student')
  or public.is_admin()
);

drop policy if exists "Students can read published questions" on public.questions;
create policy "Students can read published questions"
on public.questions for select
using (is_published = true or public.is_admin());

drop policy if exists "Admins can insert questions" on public.questions;
create policy "Admins can insert questions"
on public.questions for insert
with check (public.is_admin());

drop policy if exists "Admins can update questions" on public.questions;
create policy "Admins can update questions"
on public.questions for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete questions" on public.questions;
create policy "Admins can delete questions"
on public.questions for delete
using (public.is_admin());

drop policy if exists "Students can read their attempts" on public.attempts;
create policy "Students can read their attempts"
on public.attempts for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Students can insert their attempts" on public.attempts;
create policy "Students can insert their attempts"
on public.attempts for insert
with check (user_id = auth.uid());

drop policy if exists "Students can update their attempts" on public.attempts;
create policy "Students can update their attempts"
on public.attempts for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Students can delete their attempts" on public.attempts;
create policy "Students can delete their attempts"
on public.attempts for delete
using (user_id = auth.uid());

drop policy if exists "Students can read their sessions" on public.session_results;
create policy "Students can read their sessions"
on public.session_results for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Students can insert their sessions" on public.session_results;
create policy "Students can insert their sessions"
on public.session_results for insert
with check (user_id = auth.uid());

drop policy if exists "Students can update their sessions" on public.session_results;
create policy "Students can update their sessions"
on public.session_results for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Students can delete their sessions" on public.session_results;
create policy "Students can delete their sessions"
on public.session_results for delete
using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-images',
  'question-images',
  false,
  1048576,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Signed-in students can read question images" on storage.objects;
create policy "Signed-in students can read question images"
on storage.objects for select
using (
  bucket_id = 'question-images'
  and auth.role() = 'authenticated'
);

drop policy if exists "Admins can upload question images" on storage.objects;
create policy "Admins can upload question images"
on storage.objects for insert
with check (
  bucket_id = 'question-images'
  and public.is_admin()
);

drop policy if exists "Admins can update question images" on storage.objects;
create policy "Admins can update question images"
on storage.objects for update
using (
  bucket_id = 'question-images'
  and public.is_admin()
)
with check (
  bucket_id = 'question-images'
  and public.is_admin()
);

drop policy if exists "Admins can delete question images" on storage.objects;
create policy "Admins can delete question images"
on storage.objects for delete
using (
  bucket_id = 'question-images'
  and public.is_admin()
);

