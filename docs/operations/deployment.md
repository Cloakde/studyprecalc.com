# Deployment

First public deployment target: Vercel.

## Current Domain

- Primary domain: `studyprecalc.com`
- Optional redirect later: `www.studyprecalc.com` -> `studyprecalc.com`

## Build Settings

Use these settings if Vercel does not auto-detect them:

- Framework preset: Vite
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

These are also captured in `vercel.json`.

## Environment Variables

Set these in the Vercel project before the production deployment:

```txt
VITE_SUPABASE_URL=https://cwjmaxeaszaklbjwlvyg.supabase.co
VITE_SUPABASE_ANON_KEY=<browser-safe Supabase publishable or anon key>
```

Optional:

```txt
VITE_DESMOS_API_KEY=<Desmos API key>
```

After changing any Vite environment variable, redeploy the project so the static bundle is rebuilt with the new value.

## Deploy From Vercel Dashboard

1. Push or import this repository into GitHub.
2. In Vercel, create a new project from that GitHub repository.
3. Confirm the build settings above.
4. Add the environment variables above for Production, Preview, and Development unless you intentionally want different values.
5. Deploy.
6. Confirm the generated `*.vercel.app` URL loads the app.

## Deploy From The CLI

Use this route only after logging in to Vercel:

```sh
npx vercel login
npx vercel --prod
```

The CLI will ask which Vercel account/project to connect to the folder. After the first link, future production deploys can use `npx vercel --prod`.

## Connect `studyprecalc.com`

1. In the Vercel project, open Settings -> Domains.
2. Add `studyprecalc.com`.
3. Add `www.studyprecalc.com` too if you want both forms to work.
4. Use the exact DNS records Vercel shows for the domain.
5. In the domain registrar DNS panel, remove conflicting old website records, then add the Vercel-provided records.
6. Wait for Vercel to show the domain as configured.

Typical records are an apex `A` record for `studyprecalc.com` and a `CNAME` record for `www`, but Vercel can show project-specific values. Use the values from the Vercel Domains screen when they differ.

## Supabase Checklist Before Real Students

The public app can launch before this is done, but production accounts and saved progress need it:

1. Run `supabase/schema.sql` in the Supabase SQL Editor.
2. Create the owner account through the app.
3. Promote the owner account:

```sql
update public.profiles
set role = 'admin'
where email = 'your-email@example.com';
```

4. Smoke-test sign-up, sign-in, practice submission, session completion, and dashboard persistence.
