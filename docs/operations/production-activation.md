# M6 Production Activation Checklist

Use this checklist when the owner is ready to activate the first production deployment for
`studyprecalc.com`. Follow the steps in order.

## Access Needed

Codex can verify local files, local environment shape, tests, lint, and production HTTP responses
after deployment.

The owner must complete dashboard-only steps in Supabase, Vercel, the domain registrar, and any
email inbox used for account confirmation.

## 1. Verify Local Environment

Owner or Codex, from the repository root:

```sh
npm run validate:content
npm test
npm run lint
npm run build
```

Codex can verify:

- The repository builds locally.
- `.env` exists locally if the owner has configured it.
- The app can run in cloud mode when browser-safe Supabase env vars are present.
- After Supabase SQL is installed, `npm run smoke:supabase` can verify the invite RPC, unpublished
  content access, and optional admin login.

Owner must verify:

- `VITE_SUPABASE_ANON_KEY` is the publishable or legacy anon public key, never `service_role`.
- Any private values shown in local terminals or dashboards are not pasted into docs or commits.

## 2. Run Supabase SQL

Owner, in the Supabase dashboard:

1. Open the production Supabase project.
2. Open SQL Editor.
3. Paste and run the full contents of `supabase/schema.sql`.
4. Run the SQL verification queries in [Supabase setup](supabase-setup.md#verify-sql-setup).

Codex can verify the SQL file exists and can review its contents locally. Codex cannot run SQL in
the owner's Supabase project without owner dashboard access.

## 3. Bootstrap Admin Invite

Owner, in Supabase SQL Editor:

1. Create the one-time owner admin invite using the SQL in
   [Bootstrap The First Admin](supabase-setup.md#bootstrap-the-first-admin).
2. Replace the placeholder email before running it. Let SQL generate the high-entropy invite code.
   Do not use predictable codes such as `OWNER-2026`.
3. Open the deployed app or local app configured with Supabase env vars.
4. Sign up with the matching owner email and invite code.
5. Confirm email if Supabase email confirmation is enabled.
6. Sign in and confirm the `Admin` badge plus `Manage Content` and `Classes` tabs are visible.
7. Run the profile and invite verification queries from the Supabase setup runbook.

Codex can verify the local UI path exists. The owner must create the production invite and confirm
the production account.

## 4. Configure Auth Redirects

Owner, in Supabase Auth URL Configuration:

1. Set Site URL to `https://studyprecalc.com`.
2. Add redirect URLs for:
   - `https://studyprecalc.com/**`
   - `https://www.studyprecalc.com/**`
   - Vercel preview URLs
   - `http://127.0.0.1:5173/**`
   - `http://localhost:5173/**`
3. Keep email/password auth enabled.
4. If email confirmation is enabled, run one signup and confirm the link returns to the expected
   app URL.

Codex cannot verify Supabase Auth dashboard settings directly unless the owner provides access or
screenshots.

## 5. Configure Vercel Environment Variables

Owner, in the Vercel project settings, set these for Production:

```txt
VITE_SUPABASE_URL=https://cwjmaxeaszaklbjwlvyg.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase publishable key or legacy anon public key>
```

Optional:

```txt
VITE_DESMOS_API_KEY=<Desmos API key>
```

Also set the same values for Preview and Development unless those builds should intentionally use
browser-local fallback mode. Redeploy after changing any `VITE_` variable.

Codex can verify the expected variable names from repo docs. The owner must enter the real values in
Vercel.

## 6. Deploy

Owner, in Vercel:

1. Import or connect the GitHub repository.
2. Confirm the Vite settings:
   - Build command: `npm run build`
   - Output directory: `dist`
3. Deploy the production branch.
4. Open the generated `*.vercel.app` URL.
5. Confirm the login screen says `Cloud account`.
6. Sign in as the owner admin.

Codex can verify a deployment URL after the owner shares it or after public DNS is live.

## 7. Connect `studyprecalc.com`

Owner, in Vercel and the domain registrar:

1. Add `studyprecalc.com` in Vercel Project Settings -> Domains.
2. Add `www.studyprecalc.com` if the `www` host should work.
3. Copy the exact DNS records Vercel provides.
4. In the registrar DNS panel, remove conflicting old website records.
5. Add the Vercel DNS records.
6. Set `studyprecalc.com` as the primary domain.
7. Configure `www.studyprecalc.com` to redirect to the primary domain if desired.
8. Wait until Vercel shows the domains as configured.

Codex can run DNS and HTTP checks after the records propagate.

## 8. Run App Smoke Tests

Owner or Codex after deployment:

1. Run `npm run smoke:supabase` locally after `.env` points at the production Supabase project.
2. Optionally set `SMOKE_ADMIN_EMAIL` and `SMOKE_ADMIN_PASSWORD`, then rerun
   `npm run smoke:supabase` to verify admin login and `profiles.role = admin`.
3. Open `https://studyprecalc.com`.
4. Confirm the auth screen says `Cloud account`.
5. Sign in as the owner admin.
6. Confirm `Admin`, `Manage Content`, and `Classes` are visible.
7. Create a class and a student invite.
8. Run the invite checks in
   [Invite Enforcement Smoke Test](supabase-setup.md#invite-enforcement-smoke-test).
9. Create and publish one original text-only smoke question.
10. Sign up as a student in a private window or different browser profile using the invite.
11. Confirm the published question appears in Practice.
12. Submit one practice attempt.
13. Confirm the Dashboard updates.
14. Verify the question row and attempt row with the SQL checks in
    [Content Publishing Smoke Test](supabase-setup.md#content-publishing-smoke-test).
15. Archive or delete the smoke question.

Codex can verify public HTTP responses and local app behavior. Owner dashboard access is required
for SQL verification, invite/account confirmation, and any private production data inspection.

## 9. Roll Back If Needed

Owner, if production breaks:

1. In Vercel, open the project Deployments list.
2. Promote the last known-good deployment.
3. Re-run the domain HTTP checks from [Deployment Runbook](deployment.md#domain-deploy-checks).
4. Re-run owner login.
5. Re-run one student invite signup or practice persistence check if auth or data changed.

CLI option after Vercel login:

```sh
npx vercel promote <known-good-deployment-url>
```

If Supabase SQL caused the issue, do not guess at destructive fixes. Capture the failing query or UI
behavior, preserve the current database state, and prepare an explicit SQL repair plan before making
additional production changes.
