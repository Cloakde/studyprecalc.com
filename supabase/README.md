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
insert into public.invites (code, role, email, expires_at)
values (
  public.normalize_invite_code('OWNER-2026'),
  'admin',
  lower(trim('your-email@example.com')),
  now() + interval '7 days'
);
```

Then sign up through the app with that invite code and matching email. If the owner profile already
exists, make yourself an admin from the SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'your-email@example.com';
```
