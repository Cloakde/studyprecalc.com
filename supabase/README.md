# Supabase Setup

Run `schema.sql` in the Supabase SQL Editor for the project before using cloud sync.

This creates:

- `profiles` for account display names and admin roles.
- `questions` for cloud-managed question content with draft, published, and archived states.
- `classes`, `class_enrollments`, and `invites` for invite-only student access.
- `attempts` for per-question student work.
- `session_results` for grouped practice sessions and dashboard analytics.
- `question-images` storage bucket for AP-style graphs, tables, and diagrams.

The app uses the browser-safe publishable/anon key. Never put the `service_role` key in `.env` or frontend code.

## First Admin

Public signup is invite-only at the database level. Bootstrap the owner by creating a one-time admin
invite in the SQL Editor:

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
  lower(trim('your-email@example.com')),
  now() + interval '7 days'
from generated_invite
returning code, role, email, expires_at;
```

Then sign up through the app with that invite code and matching email. If the owner profile already
exists, make yourself an admin from the SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'your-email@example.com';
```

## Admin MFA

Production admin actions require both:

- `public.profiles.role = 'admin'`
- a Supabase Auth JWT with `aal = 'aal2'`

After creating or promoting the owner admin, enroll and verify TOTP MFA in the app before managing
questions, classes, invites, media records, or `question-images` storage. Admin accounts without an
active `aal2` session can still read their own profile row, but RLS/storage policies deny elevated
admin table and storage access until MFA is verified.

For SQL Editor diagnostics, `public.has_admin_role()` checks the profile role only. Runtime RLS and
Storage policies use `public.is_admin()`, which requires the admin role and `aal2`.
