# Supabase Setup Runbook

Use this runbook to prepare the production Supabase project for Study Precalc.

## Project Values

- Production Supabase URL: `https://cwjmaxeaszaklbjwlvyg.supabase.co`
- Frontend URL after domain launch: `https://studyprecalc.com`
- Local dev URL: `http://127.0.0.1:5173`
- Required SQL file: `supabase/schema.sql`
- Required storage bucket: `question-images`

The frontend uses only browser-safe Supabase keys. Never put a `service_role` key in `.env`,
Vercel environment variables, frontend code, or docs examples.

## Environment Variables

Local development:

```txt
VITE_SUPABASE_URL=https://cwjmaxeaszaklbjwlvyg.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase publishable key or legacy anon public key>
```

Optional:

```txt
VITE_DESMOS_API_KEY=<Desmos API key>
```

Production and Preview in Vercel must use the same names because Vite only exposes variables that
are prefixed with `VITE_`. The value of `VITE_SUPABASE_ANON_KEY` may be Supabase's current
publishable key or an older project's `anon` public key.

After changing any Vite variable, rebuild or redeploy the app.

## Run The SQL Schema

1. Open the Supabase dashboard for the production project.
2. Open the SQL Editor.
3. Paste the full contents of `supabase/schema.sql`.
4. Run the script.

The script is intended to be rerunnable. It creates or updates:

- Tables: `profiles`, `questions`, `classes`, `class_enrollments`, `invites`, `media_records`,
  `question_media`, `attempts`, and `session_results`.
- Functions and triggers for profile creation, invite validation, admin checks, class membership,
  and `updated_at` timestamps.
- Row Level Security policies for student-owned progress, admin-managed content, classes, invites,
  and media metadata.
- A private Storage bucket named `question-images` with a 1 MB file limit and these MIME types:
  `image/png`, `image/jpeg`, `image/webp`, `image/gif`, and `image/svg+xml`.

## Verify SQL Setup

Run these checks in the Supabase SQL Editor after the schema completes.

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'questions',
    'classes',
    'class_enrollments',
    'invites',
    'media_records',
    'question_media',
    'attempts',
    'session_results'
  )
order by table_name;
```

Expected result: all nine table names.

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'question-images';
```

Expected result: one row, `public = false`, `file_size_limit = 1048576`.

```sql
select schemaname, tablename, policyname
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;
```

Expected result: policies for student-owned progress, admin-managed content, admin-managed invites,
class access, media metadata, and `question-images` storage objects.

## Configure Auth

In Supabase Auth URL configuration:

- Site URL: `https://studyprecalc.com`
- Additional redirect URLs:
  - `https://studyprecalc.com/**`
  - `https://www.studyprecalc.com/**`
  - `https://*-<vercel-team-or-account-slug>.vercel.app/**`
  - `http://127.0.0.1:5173/**`
  - `http://localhost:5173/**`

Email/password auth must be enabled. If email confirmation is enabled, account creation will show a
confirmation notice and the user must confirm email before login.

## Storage Bucket

`supabase/schema.sql` creates the `question-images` bucket and storage object policies. Confirm the
bucket in Supabase Storage after running the SQL.

Current app behavior:

- Server-backed question text and metadata are saved in `public.questions`.
- Browser-uploaded images still use `local-image:<id>` references and are browser-local.
- Production smoke-test content should be text-only or use stable HTTPS image URLs until the app has
  a Supabase Storage upload adapter for authored question images.
- Do not upload copyrighted College Board prompts, diagrams, rubrics, or images.

## Bootstrap The First Admin

The production UI requires an invite code before signup, so bootstrap the owner with a one-time
admin invite from the SQL Editor.

Replace the email and code first:

```sql
insert into public.invites (code, role, email, expires_at)
values (
  public.normalize_invite_code('OWNER-2026'),
  'admin',
  lower(trim('owner@example.com')),
  now() + interval '7 days'
)
on conflict (code) do update
set role = excluded.role,
    email = excluded.email,
    expires_at = excluded.expires_at,
    revoked_at = null,
    consumed_at = null,
    consumed_by = null;
```

Then:

1. Open the deployed app or the local dev app configured with Supabase env vars.
2. Select `Sign Up`.
3. Enter the bootstrap invite code and select `Unlock Sign Up`.
4. Create the owner account with the matching email address.
5. Confirm the email if Supabase email confirmation is enabled.
6. Log in and confirm the header shows the `Admin` badge plus `Manage Content` and `Classes` tabs.

Verify in SQL:

```sql
select id, email, display_name, role, created_at
from public.profiles
where email = lower('owner@example.com');
```

Expected result: one row with `role = 'admin'`.

```sql
select code, role, email, consumed_at, consumed_by
from public.invites
where code = public.normalize_invite_code('OWNER-2026');
```

Expected result: `consumed_at` and `consumed_by` are populated.

If the owner account already exists but is not an admin, promote it from the SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = lower('owner@example.com');
```

## Invite Setup

Admins can create invites from the app after bootstrap:

1. Log in as an admin.
2. Open `Classes`.
3. Create a class.
4. Select that class in `Create Invite`.
5. Optionally enter a student email and expiration date.
6. Select `Create Invite`, then copy the generated code.

Student signup flow:

1. Student opens `Sign Up`.
2. Student enters the invite code and selects `Unlock Sign Up`.
3. Student creates an account.
4. If the invite was class-scoped, the database creates a `class_enrollments` row after signup.

SQL fallback for creating a student invite:

```sql
insert into public.invites (code, role, email, class_id, expires_at)
values (
  public.normalize_invite_code('STUD-2026'),
  'student',
  lower(trim('student@example.com')),
  null,
  now() + interval '14 days'
);
```

Use a real `classes.id` instead of `null` to make the invite enroll the student into a class.

Verify invite consumption:

```sql
select code, role, email, class_id, consumed_at, consumed_by, revoked_at
from public.invites
where code = public.normalize_invite_code('STUD-2026');
```

```sql
select c.name, e.email, e.display_name, e.role, e.created_at
from public.class_enrollments e
join public.classes c on c.id = e.class_id
where e.email = lower('student@example.com')
order by e.created_at desc;
```

## Content Publishing Smoke Test

Use only original throwaway content for this test.

1. Log in as an admin.
2. Open `Manage Content`.
3. Create a text-only MCQ with a unique ID such as `smoke-publish-001`.
4. Fill in the required metadata: unit, topic, skill, section, difficulty, calculator policy, and
   tags.
5. Fill in the prompt, four choices, correct choice, choice explanations, explanation summary,
   solution steps, and at least one common mistake.
6. Confirm the publish checklist says the question is ready.
7. Select `Publish`.
8. Select `Refresh Library`.

Verify the published row:

```sql
select
  id,
  status,
  is_published,
  content -> 'question' ->> 'type' as question_type,
  content -> 'question' ->> 'unit' as unit,
  content -> 'question' ->> 'topic' as topic,
  updated_at
from public.questions
where id = 'smoke-publish-001';
```

Expected result: `status = 'published'` and `is_published = true`.

Student visibility smoke test:

1. Create or use a student invite.
2. Sign up as a student in a different browser profile or private window.
3. Open `Practice`.
4. Confirm `smoke-publish-001` is available.
5. Submit one answer.

Verify progress persistence:

```sql
select p.email, a.question_id, a.score, a.max_score, a.is_correct, a.submitted_at
from public.attempts a
join public.profiles p on p.id = a.user_id
where p.email = lower('student@example.com')
  and a.question_id = 'smoke-publish-001'
order by a.submitted_at desc
limit 5;
```

Archive or delete the smoke question after the test:

```sql
update public.questions
set status = 'archived',
    is_published = false,
    archived_at = now()
where id = 'smoke-publish-001';
```

## Troubleshooting

- `Cloud account` does not appear on the login screen: confirm both Supabase Vite env vars are set
  and the app was rebuilt after the change.
- Signup says the invite is unavailable: verify the invite code is uppercase-normalized, not used,
  not expired, not revoked, and matches the email if an email was set.
- Admin tabs are missing: verify `public.profiles.role = 'admin'` for that user, then sign out and
  sign back in.
- Students cannot see a question: verify `public.questions.status = 'published'` and
  `is_published = true`.
- Attempts do not persist: verify the user is signed in through Supabase, not the local dev admin,
  and that `public.attempts` RLS policies exist.

## References

- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Storage buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
