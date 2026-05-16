# Supabase Setup Runbook

Use this runbook to prepare the production Supabase project for Study Precalc.

For the ordered owner-facing M17/M18 launch flow, start with
[M17/M18 Production Activation Checklist](production-activation.md).

## Project Values

- Production Supabase URL: `https://cwjmaxeaszaklbjwlvyg.supabase.co`
- Frontend URL after domain launch: `https://studyprecalc.com`
- Local dev URL: `http://127.0.0.1:5173`
- Required SQL file: `supabase/schema.sql`
- Required storage bucket: `question-images`

The frontend uses only browser-safe Supabase keys. Never put a `service_role` key in `.env`,
Vercel environment variables, frontend code, or docs examples.

For M17/M18, save Supabase evidence outside Git and redact private values before sharing screenshots
or terminal output. Required owner evidence includes schema success, verification query output,
Auth redirect/email-code settings, owner admin role, verified TOTP MFA, invite consumption, and
admin/student smoke results.

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
  media metadata, and admin `aal2` enforcement.
- Data API grants for `anon`/`authenticated` roles. RLS still decides which rows each user can
  actually read or write.
- A private Storage bucket named `question-images` with a 1 MB file limit and these MIME types:
  `image/png`, `image/jpeg`, `image/webp`, and `image/gif`.

Evidence to keep: the SQL Editor success message plus the verification query results below. Do not
paste the schema into other runbooks; refer back to `supabase/schema.sql`.

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
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('attempts', 'session_results')
  and grantee = 'authenticated'
order by table_name, privilege_type;
```

Expected result: both `attempts` and `session_results` show `SELECT`, `INSERT`, `UPDATE`, and
`DELETE`.

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
class access, media metadata, and `question-images` storage objects. Admin-managed write policies
should require both `profiles.role = 'admin'` and an `aal2` Supabase session.

Save these three query results with the activation evidence.

These SQL checks come before any app smoke. If any table, policy, RPC, or the `question-images`
bucket is missing, stop and rerun the full `supabase/schema.sql` before creating production smoke
accounts or content.

## Configure Auth

In Supabase Auth URL configuration:

- Site URL: `https://studyprecalc.com`
- Additional redirect URLs:
  - `https://studyprecalc.com/**`
  - `https://www.studyprecalc.com/**`
  - `https://*-<vercel-team-or-account-slug>.vercel.app/**`
  - `http://127.0.0.1:5173/**`
  - `http://localhost:5173/**`

Email/password auth must be enabled.

For production, enable email confirmation so new users must verify ownership of the email address
they used at signup. The app supports the invite-first flow followed by name, email, password, and a
six-digit email verification code.

To send a visible code instead of only a magic link, open Auth -> Email Templates -> Confirm signup
and include Supabase's `{{ .Token }}` value in the message body, for example:

```txt
Your Study Precalc verification code is {{ .Token }}.
```

Keep `{{ .ConfirmationURL }}` in the template only if you also want a fallback link. The in-app
verification screen uses the six-digit token from the email.

Enable Supabase Auth MFA with TOTP factors for production admins. Do not require MFA for student
accounts at launch; the app and RLS policies require `aal2` only for admin-managed actions.

## Storage Bucket

`supabase/schema.sql` creates the `question-images` bucket and storage object policies. Confirm the
bucket in Supabase Storage after running the SQL.

Current app behavior:

- Server-backed question text and metadata are saved in `public.questions`.
- Cloud-authored question and solution images are stored in the private `question-images` bucket.
- The bucket limit is 1 MB per file. Compress or resize large graphs before upload.
- Allowed cloud image formats are PNG, JPEG, WebP, and GIF. SVG upload is disabled for launch.
- Image metadata is stored in `public.media_records`, and the question-to-image placement is stored
  in `public.question_media`.
- Question JSON should keep stable app-level image references, not raw Supabase object URLs or signed
  URLs. A stable reference survives URL expiration, bucket policy changes, and future media moves.
- The app renders private bucket images by resolving the stable reference through media metadata and
  requesting a short-lived signed URL at display time.
- Do not upload copyrighted AP, College Board, or third-party prompts, diagrams, rubrics, or images
  unless the owner has confirmed usage rights. Prefer original graphs and diagrams that practice the
  same skills.
- Video files are not stored in Supabase app storage for now. Use YouTube, Vimeo, or another approved
  embed/link source for video explanations, with transcripts captured in content metadata.

## Admin Image Checklist

Use this checklist when testing cloud image authoring.

Local development:

1. Set `.env` with `VITE_SUPABASE_URL` and the browser-safe `VITE_SUPABASE_ANON_KEY`.
2. Run `npm run dev`, then sign in with a real Supabase admin account and complete the MFA gate. The
   dev-only local admin uses browser-local fallback and is not a cloud Storage upload test,
   production RLS check, or MFA check.
3. If Supabase env vars are absent, uploaded images remain local browser references such as
   `local-image:<id>` and are not available across browsers or devices.
4. Upload only PNG, JPEG, WebP, or GIF images under 1 MB.
5. Save the question as a draft, then confirm the draft still renders for the admin after refresh.

Evidence to keep: screenshot/checkpoint of the signed-in Supabase admin, the draft after refresh,
and any failed upload message if the test intentionally checks an invalid file.

Production:

1. Confirm the Vercel deployment has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set before
   build time.
2. Run the full contents of `supabase/schema.sql` in the production Supabase SQL Editor.
3. Verify the `question-images` bucket exists, is private, has `file_size_limit = 1048576`, and lists
   `image/png`, `image/jpeg`, `image/webp`, and `image/gif` as allowed MIME types.
4. Sign in as an admin and complete the MFA gate so the session is `aal2`.
5. Upload one original smoke image under 1 MB.
6. Save the draft and verify the image appears for the admin.
7. Publish the question and verify the image appears for a signed-in student.
8. Archive the question and verify the student can no longer read the question or its linked image.

Evidence to keep: deployed app URL, admin screenshot/checkpoint after upload, student
screenshot/checkpoint after publish, student screenshot/checkpoint after archive, and the media
metadata SQL result from [Cloud Image Storage Smoke Test](#cloud-image-storage-smoke-test).

Optional CLI write smoke after the admin and student smoke accounts exist:

```sh
SMOKE_WRITE=1 \
SMOKE_ADMIN_EMAIL=owner@example.com \
SMOKE_ADMIN_PASSWORD=replace-with-admin-password \
SMOKE_ADMIN_MFA_CODE=123456 \
SMOKE_STUDENT_EMAIL=student@example.com \
SMOKE_STUDENT_PASSWORD=replace-with-student-password \
npm run smoke:supabase
```

Expected result: `[PASS] cloud image write path`. The script uploads a tiny generated PNG, creates
metadata and question-media rows, publishes a temporary question, creates fresh signed URLs for admin
and student sessions, archives the temporary question, verifies student image access is denied after
archive, writes/updates/deletes temporary student-owned `public.attempts` and
`public.session_results` rows, verifies cleanup, and cleans up the Storage object. Use the current
six-digit TOTP value for `SMOKE_ADMIN_MFA_CODE`; omit it only when intentionally testing an admin
account without MFA.

When a smoke failure is caused by missing production setup, the command also prints
`Next owner action(s):` with the likely dashboard-side fix, such as rerunning
`supabase/schema.sql`, confirming the private `question-images` bucket, bootstrapping a real admin,
or adding the current admin TOTP code.

The CLI smoke path is implemented in `scripts/smoke-supabase.ts` and exposed as
`npm run smoke:supabase`. It supplements the manual SQL and live browser evidence; it does not
replace owner verification in the Supabase dashboard or the deployed app.

If present, `npm run smoke:live-checklist` prints a manual M18 checklist from
`scripts/live-smoke-checklist.ts`. Use it as a worksheet for evidence capture, not as proof that the
browser smoke passed.

## Bootstrap The First Admin

The production UI requires an invite code before signup, so bootstrap the owner with a one-time
admin invite from the SQL Editor. Enable Supabase email confirmation before using an admin invite,
and do not use predictable hand-written invite codes.

Replace the email first, then run this SQL. It generates a 12-character one-time code with at least
one letter, one number, and one safe symbol, expires it quickly, and returns the exact code to use:

```sql
with required_chars as (
  select substr('ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + (get_byte(gen_random_bytes(1), 0) % 24), 1) as ch
  union all
  select substr('23456789', 1 + (get_byte(gen_random_bytes(1), 0) % 8), 1)
  union all
  select substr('!@#$%*?', 1 + (get_byte(gen_random_bytes(1), 0) % 7), 1)
),
filler_chars as (
  select substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%*?', 1 + (get_byte(gen_random_bytes(1), 0) % 39), 1) as ch
  from generate_series(1, 9)
),
generated_invite as (
  select string_agg(ch, '' order by gen_random_uuid()) as code
  from (
    select ch from required_chars
    union all
    select ch from filler_chars
  ) characters
)
insert into public.invites (code, role, email, expires_at)
select
  generated_invite.code,
  'admin',
  lower(trim('owner@example.com')),
  now() + interval '30 minutes'
from generated_invite
returning code, role, email, expires_at;
```

Then:

1. Open the deployed app or the local dev app configured with Supabase env vars.
2. Select `Sign Up`.
3. Enter the returned bootstrap invite code and select `Unlock Sign Up`.
4. Create the owner account with the matching email address.
5. Enter the six-digit email verification code if Supabase email confirmation is enabled.
6. Log in and confirm the header shows the `Admin` badge plus `Manage Content` and `Classes` tabs.
7. Complete the admin MFA setup gate by scanning the TOTP QR code and entering the current code.
8. Confirm the admin tabs remain available after the session reaches `aal2`.

Evidence to keep: the returned invite row, the email verification-code checkpoint if enabled, the
admin MFA checkpoint, and a screenshot/checkpoint showing the signed-in admin UI.

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
where code = public.normalize_invite_code('<PASTE_RETURNED_CODE>');
```

Expected result: `consumed_at` and `consumed_by` are populated.

Save both admin verification query results with the activation evidence.

Verify MFA state in SQL:

```sql
select
  user_id,
  factor_type,
  status,
  created_at,
  updated_at
from auth.mfa_factors
where user_id = (
  select id
  from auth.users
  where lower(trim(email)) = lower(trim('owner@example.com'))
)
order by created_at desc;
```

Expected result: at least one `totp` factor with `status = 'verified'`.

Save this query result with the activation evidence.

If the owner account already exists but is not an admin, promote it from the SQL Editor:

```sql
insert into public.profiles (id, email, display_name, role)
select
  id,
  lower(trim(email)),
  coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1), 'Owner'),
  'admin'
from auth.users
where lower(trim(email)) = lower(trim('owner@example.com'))
on conflict (id) do update
set email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    role = 'admin'
returning id, email, display_name, role;
```

Expected result: exactly one row with `role = 'admin'`. If this returns zero rows, the owner auth
account does not exist yet.

Save the returned promotion row if this fallback is used.

## Invite Setup

Admins can create invites from the app after bootstrap:

1. Log in as an admin.
2. Complete the MFA gate if the current session is not already `aal2`.
3. Open `Classes`.
4. Create a class.
5. Select that class in `Create Invite`.
6. Optionally enter a student email and expiration date.
7. Select `Create Invite`, then copy the generated code.

Student signup flow:

1. Student opens `Sign Up`.
2. Student enters the invite code and selects `Unlock Sign Up`.
3. Student creates an account with email and password.
4. If Supabase email confirmation is enabled, student enters the six-digit email verification code.
5. If the invite was class-scoped, the database creates a `class_enrollments` row after signup.

SQL fallback for creating a student invite:

```sql
insert into public.invites (code, role, email, class_id, expires_at)
values (
  public.normalize_invite_code('ST7!UD8@CD9#'),
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
where code = public.normalize_invite_code('ST7!UD8@CD9#');
```

```sql
select c.name, e.email, e.display_name, e.role, e.created_at
from public.class_enrollments e
join public.classes c on c.id = e.class_id
where e.email = lower('student@example.com')
order by e.created_at desc;
```

Save the consumed invite row and class enrollment row if this SQL fallback is used.

## Invite Enforcement Smoke Test

Run these checks after the SQL schema is installed and before giving codes to students.

Known-bad invite check:

```sql
select *
from public.validate_invite('ZZ9!ZZ9!ZZ9!', 'student@example.com');
```

Expected result: `is_valid = false` and `reason = 'not-found'`.

Email mismatch check:

```sql
with smoke_invite as (
  with required_chars as (
    select substr('ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + (get_byte(gen_random_bytes(1), 0) % 24), 1) as ch
    union all
    select substr('23456789', 1 + (get_byte(gen_random_bytes(1), 0) % 8), 1)
    union all
    select substr('!@#$%*?', 1 + (get_byte(gen_random_bytes(1), 0) % 7), 1)
  ),
  filler_chars as (
    select substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%*?', 1 + (get_byte(gen_random_bytes(1), 0) % 39), 1) as ch
    from generate_series(1, 9)
  ),
  generated_invite as (
    select string_agg(ch, '' order by gen_random_uuid()) as code
    from (
      select ch from required_chars
      union all
      select ch from filler_chars
    ) characters
  )
  insert into public.invites (code, role, email, expires_at)
  select
    generated_invite.code,
    'student',
    lower(trim('student@example.com')),
    now() + interval '30 minutes'
  from generated_invite
  returning code
)
select validate_invite.*
from smoke_invite
cross join public.validate_invite(smoke_invite.code, 'wrong@example.com') as validate_invite;
```

Expected result: `is_valid = false` and `reason = 'email-mismatch'`.

Class invite consumption check:

1. Create a temporary class from the app or SQL.
2. Create an email-bound student invite for that class.
3. Sign up as that student with the matching email and invite code.
4. Verify the invite is consumed and cannot be reused:

```sql
select code, email, class_id, consumed_at, consumed_by, revoked_at
from public.invites
where email = lower('student@example.com')
order by created_at desc
limit 1;
```

```sql
select *
from public.validate_invite('<PASTE_CONSUMED_CODE>', 'student@example.com');
```

Expected result: the invite row has `consumed_at` and `consumed_by`; the reused invite check returns
`is_valid = false` and `reason = 'used'`.

Verify class enrollment:

```sql
select c.name, e.email, e.display_name, e.role, e.created_at
from public.class_enrollments e
join public.classes c on c.id = e.class_id
where e.email = lower('student@example.com')
order by e.created_at desc;
```

Expected result: one row for the class-scoped invite.

Evidence to keep: SQL output for the invalid invite, mismatch invite, consumed invite, reused
invite, and class enrollment checks.

Do not save raw invite codes in Git. Store activation invite codes and screenshots with visible codes
only in the owner's private evidence packet.

Signup without an invite should fail at the database trigger. The normal app UI does not expose a
no-invite submit path, so treat any successful no-invite account creation as a production blocker.

## Content Publishing Smoke Test

Use only original throwaway content for this test.
Do not use AP, College Board, or third-party copyrighted prompts, rubrics, diagrams, explanations, or
images unless the owner has confirmed usage rights.

1. Log in as an admin.
2. Complete the MFA gate if the current session is not already `aal2`.
3. Open `Manage Content`.
4. Create a text-only MCQ with a unique ID such as `smoke-publish-001`.
5. Fill in the required metadata: unit, topic, skill, section, difficulty, calculator policy, and
   tags.
6. Fill in the prompt, four choices, correct choice, choice explanations, explanation summary,
   solution steps, and at least one common mistake.
7. Confirm the publish checklist says the question is ready.
8. Select `Publish`.
9. Select `Refresh Library`.

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

Evidence to keep: admin publish checkpoint, student Practice checkpoint, attempt persistence query
result, and cleanup query result.

## Cloud Image Storage Smoke Test

Use only original throwaway images for this test. A simple generated graph or hand-authored diagram
is enough. Do not use AP or College Board assets unless rights are confirmed.

1. Log in as an admin.
2. Complete the MFA gate if the current session is not already `aal2`.
3. Open `Manage Content`.
4. Create a question with a unique ID such as `smoke-image-001`.
5. Upload one PNG, JPEG, WebP, or GIF under 1 MB to the question prompt or explanation.
6. Save the question as a draft.
7. Refresh the page and confirm the admin can still see the image.
8. Select `Publish`.
9. Sign in as a student in a private window or different browser profile.
10. Confirm the published question appears in Practice and the image renders.

Verify the storage bucket:

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'question-images';
```

Expected result: one private bucket with `file_size_limit = 1048576` and allowed MIME types limited
to PNG, JPEG, WebP, and GIF.

Verify media metadata and question linkage:

```sql
select
  q.id as question_id,
  q.status,
  qm.placement,
  qm.asset_id,
  mr.kind,
  mr.source_kind,
  mr.storage_bucket,
  mr.storage_path,
  mr.mime_type,
  mr.byte_size
from public.questions q
join public.question_media qm on qm.question_id = q.id
join public.media_records mr on mr.id = qm.media_id
where q.id = 'smoke-image-001'
order by qm.placement, qm.sort_order;
```

Expected result: at least one linked media row with `source_kind = 'storage'`,
`storage_bucket = 'question-images'`, an allowed image MIME type, and `byte_size <= 1048576`.

Student read access should work only after publish because the bucket is private and the app renders
images with signed URLs generated from stable media references. To verify denial after archive:

```sql
update public.questions
set status = 'archived',
    is_published = false,
    archived_at = now()
where id = 'smoke-image-001';
```

Then refresh the student session and confirm the question and linked image are no longer visible.

Evidence to keep: bucket query result, media linkage query result, admin draft screenshot/checkpoint,
student published-image screenshot/checkpoint, student archived-question checkpoint, and optional
`[PASS] cloud image write path` CLI output if the automated write smoke is run.

## Troubleshooting

- `Cloud account` does not appear on the login screen: confirm both Supabase Vite env vars are set
  and the app was rebuilt after the change.
- Signup says the invite is unavailable: verify the invite code is uppercase-normalized, not used,
  not expired, not revoked, and matches the email if an email was set.
- Admin tabs are missing: verify `public.profiles.role = 'admin'` for that user, then sign out and
  sign back in.
- Admin actions fail after login: complete the TOTP MFA gate and confirm the Supabase session is
  `aal2`; production RLS rejects admin writes from password-only sessions.
- Students cannot see a question: verify `public.questions.status = 'published'` and
  `is_published = true`.
- Students cannot see a question image: verify the question is published, the image has rows in
  `public.media_records` and `public.question_media`, the Storage object is in `question-images`,
  and the file is an allowed image type under 1 MB.
- Admin image upload fails: verify the signed-in account has `public.profiles.role = 'admin'`, the
  bucket exists from `supabase/schema.sql`, and the file is PNG, JPEG, WebP, or GIF rather than SVG.
- Attempts do not persist: verify the user is signed in through Supabase, not the local dev admin,
  and that `public.attempts` RLS policies exist.
- `permission denied for table attempts` or `permission denied for table session_results`: rerun
  the latest `supabase/schema.sql`, or run this repair query in the Supabase SQL Editor:
- If read-only progress checks pass but student progress writes fail, rerun
  `SMOKE_WRITE=1` with real `SMOKE_STUDENT_EMAIL` and `SMOKE_STUDENT_PASSWORD`; the smoke writes
  generated temporary rows only and deletes them before exit.

```sql
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

revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;
```

## References

- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Storage buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
