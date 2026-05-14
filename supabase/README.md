# Supabase Setup

Run `schema.sql` in the Supabase SQL Editor for the project before using cloud sync.

This creates:

- `profiles` for account display names and admin roles.
- `questions` for future cloud-managed question content.
- `attempts` for per-question student work.
- `session_results` for grouped practice sessions and dashboard analytics.
- `question-images` storage bucket for AP-style graphs, tables, and diagrams.

The app uses the browser-safe publishable/anon key. Never put the `service_role` key in `.env` or frontend code.

## First Admin

After creating your own account, make yourself an admin from the SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'your-email@example.com';
```
