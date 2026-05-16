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
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_published boolean not null default false,
  question_type text check (question_type in ('mcq', 'frq')),
  unit text,
  topic text,
  skill text,
  difficulty text check (difficulty in ('intro', 'medium', 'advanced')),
  calculator text check (calculator in ('none', 'graphing')),
  section text check (section in ('practice', 'mcq-a', 'mcq-b', 'frq-a', 'frq-b')),
  tags text[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  published_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (is_published = (status = 'published'))
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  account_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now(),
  unique (class_id, account_id)
);

create or replace function public.normalize_invite_code(code text)
returns text
language sql
immutable
as $$
  select regexp_replace(upper(trim(coalesce(code, ''))), '\s+', '', 'g');
$$;

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  role text not null default 'student' check (role in ('student', 'admin')),
  email text,
  class_id uuid references public.classes(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  consumed_at timestamptz,
  consumed_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  check (code = public.normalize_invite_code(code)),
  constraint invites_code_format_check check (code ~ '^[A-Z0-9!@#$%*?]{12}$'),
  check (email is null or email = lower(trim(email))),
  check ((consumed_at is null and consumed_by is null) or (consumed_at is not null and consumed_by is not null))
);

do $$
declare
  existing_constraint_name text;
begin
  alter table public.invites drop constraint if exists invites_code_format_check;

  for existing_constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.invites'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%code ~%'
  loop
    execute format('alter table public.invites drop constraint %I', existing_constraint_name);
  end loop;

  alter table public.invites
    add constraint invites_code_format_check
    check (code ~ '^[A-Z0-9!@#$%*?]{12}$') not valid;
end;
$$;

create table if not exists public.media_records (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('image', 'graph', 'table', 'thumbnail', 'transcript', 'video')),
  source_kind text not null check (source_kind in ('storage', 'external')),
  storage_bucket text,
  storage_path text,
  external_url text,
  mime_type text,
  byte_size integer check (byte_size is null or byte_size >= 0),
  alt text,
  caption text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (source_kind = 'storage' and storage_bucket is not null and storage_path is not null and external_url is null)
    or
    (source_kind = 'external' and external_url is not null and storage_bucket is null and storage_path is null)
  )
);

create table if not exists public.question_media (
  id uuid primary key default gen_random_uuid(),
  question_id text not null references public.questions(id) on delete cascade,
  media_id uuid not null references public.media_records(id) on delete restrict,
  placement text not null check (placement in ('question', 'explanation', 'video', 'thumbnail', 'transcript')),
  asset_id text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (question_id, placement, asset_id)
);

alter table public.questions
  add column if not exists status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  add column if not exists question_type text check (question_type in ('mcq', 'frq')),
  add column if not exists unit text,
  add column if not exists topic text,
  add column if not exists skill text,
  add column if not exists difficulty text check (difficulty in ('intro', 'medium', 'advanced')),
  add column if not exists calculator text check (calculator in ('none', 'graphing')),
  add column if not exists section text check (section in ('practice', 'mcq-a', 'mcq-b', 'frq-a', 'frq-b')),
  add column if not exists tags text[] not null default '{}',
  add column if not exists updated_by uuid references public.profiles(id) on delete set null,
  add column if not exists published_by uuid references public.profiles(id) on delete set null,
  add column if not exists published_at timestamptz,
  add column if not exists archived_at timestamptz;

update public.questions
set status = 'published'
where is_published = true
  and status <> 'published';

update public.questions
set is_published = (status = 'published');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'questions_is_published_status_check'
  ) then
    alter table public.questions
      add constraint questions_is_published_status_check
      check (is_published = (status = 'published'));
  end if;
end;
$$;

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

create unique index if not exists profiles_email_lower_idx
  on public.profiles(lower(email));

create index if not exists questions_status_updated_idx
  on public.questions(status, updated_at desc);

create index if not exists questions_filter_idx
  on public.questions(status, question_type, unit, difficulty, calculator);

create index if not exists questions_tags_gin_idx
  on public.questions using gin(tags);

create index if not exists classes_active_name_idx
  on public.classes(archived_at, name);

create index if not exists class_enrollments_account_idx
  on public.class_enrollments(account_id, class_id);

create index if not exists invites_class_idx
  on public.invites(class_id);

create index if not exists invites_email_idx
  on public.invites(email)
  where email is not null;

create index if not exists invites_active_idx
  on public.invites(expires_at, created_at)
  where consumed_at is null and revoked_at is null;

create unique index if not exists media_storage_object_idx
  on public.media_records(storage_bucket, storage_path)
  where source_kind = 'storage';

create index if not exists question_media_question_idx
  on public.question_media(question_id, placement, sort_order);

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

drop trigger if exists classes_set_updated_at on public.classes;
create trigger classes_set_updated_at
before update on public.classes
for each row execute function public.set_updated_at();

drop trigger if exists invites_set_updated_at on public.invites;
create trigger invites_set_updated_at
before update on public.invites
for each row execute function public.set_updated_at();

drop trigger if exists media_records_set_updated_at on public.media_records;
create trigger media_records_set_updated_at
before update on public.media_records
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_code text := public.normalize_invite_code(new.raw_user_meta_data ->> 'invite_code');
  invite_record public.invites%rowtype;
  profile_role text := 'student';
  display_name text := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1), 'Student');
  normalized_email text := lower(trim(coalesce(new.email, '')));
begin
  if invite_code = '' then
    raise exception 'Study Precalc is invite-only. A valid invite code is required.';
  end if;

  select *
  into invite_record
  from public.invites
  where code = invite_code
  for update;

  if not found then
    raise exception 'Invite code is not valid.';
  end if;

  if invite_record.revoked_at is not null then
    raise exception 'Invite code has been revoked.';
  end if;

  if invite_record.consumed_at is not null then
    raise exception 'Invite code has already been used.';
  end if;

  if invite_record.expires_at is not null and invite_record.expires_at < now() then
    raise exception 'Invite code has expired.';
  end if;

  if invite_record.email is not null and invite_record.email <> normalized_email then
    raise exception 'Invite code does not match this email address.';
  end if;

  profile_role := invite_record.role;

  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    normalized_email,
    display_name
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        role = public.profiles.role;

  update public.profiles
  set role = profile_role
  where id = new.id
    and role <> 'admin';

  if invite_record.id is not null then
    update public.invites
    set consumed_at = now(),
        consumed_by = new.id
    where id = invite_record.id;

    if invite_record.class_id is not null then
      insert into public.class_enrollments (
        class_id,
        account_id,
        email,
        display_name,
        role
      )
      values (
        invite_record.class_id,
        new.id,
        normalized_email,
        display_name,
        profile_role
      )
      on conflict (class_id, account_id) do update
        set email = excluded.email,
            display_name = excluded.display_name,
            role = excluded.role;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop function if exists public.validate_invite(text, text);
create function public.validate_invite(p_code text, p_email text default null)
returns table(
  is_valid boolean,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_record public.invites%rowtype;
  invite_code text := public.normalize_invite_code(p_code);
  normalized_email text := lower(trim(coalesce(p_email, '')));
begin
  if invite_code = '' then
    return query select false, 'missing';
    return;
  end if;

  select *
  into invite_record
  from public.invites
  where code = invite_code;

  if not found then
    return query select false, 'not-found';
    return;
  end if;

  if invite_record.revoked_at is not null then
    return query select false, 'revoked';
    return;
  end if;

  if invite_record.consumed_at is not null then
    return query select false, 'used';
    return;
  end if;

  if invite_record.expires_at is not null and invite_record.expires_at < now() then
    return query select false, 'expired';
    return;
  end if;

  if invite_record.email is not null and (normalized_email = '' or invite_record.email <> normalized_email) then
    return query select false, 'email-mismatch';
    return;
  end if;

  return query select true, null::text;
end;
$$;

grant execute on function public.validate_invite(text, text) to anon, authenticated;

create or replace function public.has_admin_role()
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

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_admin_role()
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

create or replace function public.is_class_member(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.class_enrollments
    where class_enrollments.class_id = target_class_id
      and account_id = auth.uid()
  );
$$;

create or replace function public.can_read_question_image(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.media_records
      join public.question_media on question_media.media_id = media_records.id
      join public.questions on questions.id = question_media.question_id
      where media_records.source_kind = 'storage'
        and media_records.storage_bucket = 'question-images'
        and media_records.storage_path = object_name
        and questions.status = 'published'
    );
$$;

alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.session_results enable row level security;
alter table public.classes enable row level security;
alter table public.class_enrollments enable row level security;
alter table public.invites enable row level security;
alter table public.media_records enable row level security;
alter table public.question_media enable row level security;

grant usage on schema public to anon, authenticated;

grant select on public.profiles to authenticated;
grant select on public.questions, public.media_records, public.question_media to anon, authenticated;
grant insert, update, delete on public.questions, public.media_records, public.question_media
  to authenticated;
grant select, insert, update, delete
  on public.classes, public.class_enrollments, public.invites
  to authenticated;
grant select, insert, update, delete
  on public.attempts, public.session_results
  to authenticated;

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

revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

drop policy if exists "Students can read published questions" on public.questions;
create policy "Students can read published questions"
on public.questions for select
using (
  public.is_admin()
  or (
    auth.role() = 'authenticated'
    and status = 'published'
  )
);

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

drop policy if exists "Admins can manage classes" on public.classes;
create policy "Admins can manage classes"
on public.classes for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Members can read their classes" on public.classes;
create policy "Members can read their classes"
on public.classes for select
using (public.is_admin() or public.is_class_member(id));

drop policy if exists "Admins can manage class enrollments" on public.class_enrollments;
create policy "Admins can manage class enrollments"
on public.class_enrollments for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Students can read their class enrollments" on public.class_enrollments;
create policy "Students can read their class enrollments"
on public.class_enrollments for select
using (account_id = auth.uid() or public.is_admin());

drop policy if exists "Admins can manage invites" on public.invites;
create policy "Admins can manage invites"
on public.invites for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage media records" on public.media_records;
create policy "Admins can manage media records"
on public.media_records for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Students can read published media records" on public.media_records;
create policy "Students can read published media records"
on public.media_records for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.question_media
    join public.questions on questions.id = question_media.question_id
    where question_media.media_id = media_records.id
      and questions.status = 'published'
  )
);

drop policy if exists "Admins can manage question media" on public.question_media;
create policy "Admins can manage question media"
on public.question_media for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Students can read published question media" on public.question_media;
create policy "Students can read published question media"
on public.question_media for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.questions
    where questions.id = question_media.question_id
      and questions.status = 'published'
  )
);

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
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
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
  and public.can_read_question_image(name)
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
