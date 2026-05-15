# M17/M18 Production Activation Checklist

Use this checklist when the owner is ready to activate the first production deployment for
`studyprecalc.com` and collect the live admin/student smoke evidence. Follow the steps in order.

For the short owner evidence packet and admin/student smoke handoff, use
[M17/M18 Owner Evidence Handoff](m9-m10-owner-handoff.md).

## Command Order

Run owner activation in this order. The automation helps gather evidence, but the Supabase,
Vercel, registrar, inbox, and live browser checks remain owner-owned dashboard work.

1. Run local repo verification on the exact deploy commit:

   ```sh
   npm run validate:content
   npm test
   npm run lint
   npm run build
   ```

2. Optionally run the repo-side production readiness helper if it is available:

   ```sh
   npm run check:production-readiness
   ```

3. Run `supabase/schema.sql` in the production Supabase SQL Editor, then run the SQL verification
   queries in [Supabase setup](supabase-setup.md#verify-sql-setup).
4. Configure Supabase Auth redirects, email-code template, and admin TOTP MFA.
5. Bootstrap or verify the real owner admin account, consume the admin invite, verify email if
   enabled, and complete TOTP MFA to `aal2`.
6. Configure Vercel Production `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then redeploy.
7. Connect or verify `studyprecalc.com` and `www.studyprecalc.com` in Vercel and DNS.
8. Run read-only Supabase smoke:

   ```sh
   npm run smoke:supabase
   ```

9. Run admin/MFA smoke when real credentials are available:

   ```sh
   SMOKE_ADMIN_EMAIL=owner@example.com \
   SMOKE_ADMIN_PASSWORD=replace-with-admin-password \
   SMOKE_ADMIN_MFA_CODE=123456 \
   npm run smoke:supabase
   ```

10. Run optional write smoke only after real admin and student smoke accounts exist:

    ```sh
    SMOKE_WRITE=1 \
    SMOKE_ADMIN_EMAIL=owner@example.com \
    SMOKE_ADMIN_PASSWORD=replace-with-admin-password \
    SMOKE_ADMIN_MFA_CODE=123456 \
    SMOKE_STUDENT_EMAIL=student@example.com \
    SMOKE_STUDENT_PASSWORD=replace-with-student-password \
    npm run smoke:supabase
    ```

11. Optionally print the live smoke checklist helper if it is available:

    ```sh
    npm run smoke:live-checklist
    ```

12. Complete the live browser smoke: admin creates class/invite, publishes original text and image
    smoke questions, student signs up in a separate browser profile, sees published content, submits
    an attempt, dashboard updates, and archived content disappears.

`npm run smoke:supabase` is implemented by `scripts/smoke-supabase.ts`. If present,
`npm run check:production-readiness` points at `scripts/check-production-readiness.ts`, and
`npm run smoke:live-checklist` points at `scripts/live-smoke-checklist.ts`. Treat all three as
repeatable evidence helpers, not replacements for the dashboard and live browser checks.

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
- Admin smoke and cloud image upload testing require a real Supabase admin account with TOTP MFA
  verified to `aal2`. The local dev-only admin is for browser-local authoring and does not prove
  production Storage access, admin RLS, or MFA enforcement.

Owner must verify:

- `VITE_SUPABASE_ANON_KEY` is the publishable or legacy anon public key, never `service_role`.
- Any private values shown in local terminals or dashboards are not pasted into docs or commits.

Evidence to keep:

- Terminal output showing all four commands passed on the deploy commit.
- Confirmation that `.env` points at the production Supabase project when running cloud smoke checks.
- Confirmation that `.env`, passwords, invite codes, TOTP seeds/codes, and service-role keys are not
  committed or pasted into docs.

## 2. Run Supabase SQL

Owner, in the Supabase dashboard:

1. Open the production Supabase project.
2. Open SQL Editor.
3. Paste and run the full contents of `supabase/schema.sql`.
4. Run the SQL verification queries in [Supabase setup](supabase-setup.md#verify-sql-setup).
5. Confirm the private `question-images` bucket has a 1 MB file limit and allows only PNG, JPEG,
   WebP, and GIF images.

Codex can verify the SQL file exists and can review its contents locally. Codex cannot run SQL in
the owner's Supabase project without owner dashboard access.

Evidence to keep:

- Supabase SQL Editor success message for `supabase/schema.sql`.
- Query results showing all required tables, the private `question-images` bucket, and expected RLS
  policies.

## 3. Bootstrap Admin Invite

Owner, in Supabase SQL Editor:

1. Create the one-time owner admin invite using the SQL in
   [Bootstrap The First Admin](supabase-setup.md#bootstrap-the-first-admin).
2. Replace the placeholder email before running it. Let SQL generate the high-entropy invite code.
   Do not use predictable codes such as `OWNER-2026`.
3. Open the deployed app or local app configured with Supabase env vars.
4. Sign up with the matching owner email and invite code.
5. Enter the six-digit email verification code if Supabase email confirmation is enabled.
6. Sign in and confirm the `Admin` badge plus `Manage Content` and `Classes` tabs are visible.
7. Complete the admin TOTP setup gate and verify the session reaches `aal2`.
8. Run the profile, invite, and MFA verification queries from the Supabase setup runbook.

Codex can verify the local UI path exists. The owner must create the production invite and confirm
the production account.

Evidence to keep:

- Returned one-time invite row with the code stored outside Git.
- Screenshot or checkpoint showing `Cloud account`, the `Admin` badge, `Manage Content`, and
  `Classes`.
- Screenshot/checkpoint showing the admin MFA gate completed.
- SQL results showing the owner profile has `role = 'admin'` and the invite has `consumed_at` and
  `consumed_by`.

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
4. If email confirmation is enabled, run one signup and confirm the email contains a six-digit code
   and the in-app verification screen accepts it.

Codex cannot verify Supabase Auth dashboard settings directly unless the owner provides access or
screenshots.

Evidence to keep:

- Screenshot or copied dashboard values for Site URL and redirect URLs.
- If email confirmation is enabled, screenshot/checkpoint that the six-digit email code verifies in
  the app.

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

Evidence to keep:

- Vercel Environment Variables screen showing `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, and optional `VITE_DESMOS_API_KEY` are configured for Production.
- Deployment timestamp after the latest `VITE_` variable change.

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
7. Complete the admin MFA gate if this browser session has not already reached `aal2`.

Codex can verify a deployment URL after the owner shares it or after public DNS is live.

Evidence to keep:

- Vercel deployment URL and deployment status showing a successful build.
- Screenshot/checkpoint from the deployed URL showing `Cloud account`.
- Screenshot/checkpoint showing owner admin login succeeded on the deployed build.

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

Evidence to keep:

- Vercel Domains screen showing configured domains.
- DNS/HTTP check output showing `studyprecalc.com` and `www.studyprecalc.com` resolve and return
  HTTP 200 after redirects.

## 8. Run App Smoke Tests

Owner or Codex after deployment:

1. Run `npm run smoke:supabase` locally after `.env` points at the production Supabase project.
   If activation pieces are missing, the smoke output includes a `Next owner action(s):` section
   that maps common failures to the required dashboard-side setup.
2. Optionally set `SMOKE_ADMIN_EMAIL`, `SMOKE_ADMIN_PASSWORD`, and `SMOKE_ADMIN_MFA_CODE`, then
   rerun `npm run smoke:supabase` to verify admin login, `profiles.role = admin`, and MFA `aal2`
   when the account has TOTP enabled.
3. For the automated cloud image write smoke, set `SMOKE_WRITE=1`, `SMOKE_ADMIN_EMAIL`,
   `SMOKE_ADMIN_PASSWORD`, `SMOKE_ADMIN_MFA_CODE`, `SMOKE_STUDENT_EMAIL`, and
   `SMOKE_STUDENT_PASSWORD`, then rerun `npm run smoke:supabase`. The script uploads a generated
   image, publishes a temporary question, checks admin/student signed URL behavior, archives it, and
   cleans up.
4. Open `https://studyprecalc.com`.
5. Confirm the auth screen says `Cloud account`.
6. Sign in as the owner admin.
7. Complete the admin MFA gate and confirm `Admin`, `Manage Content`, and `Classes` are visible.
8. Create a class and a student invite.
9. Run the invite checks in
   [Invite Enforcement Smoke Test](supabase-setup.md#invite-enforcement-smoke-test).
10. Create and publish one original text-only smoke question.
11. Sign up as a student in a private window or different browser profile using the invite.
12. Confirm the published question appears in Practice.
13. Submit one practice attempt.
14. Confirm the Dashboard updates.
15. Verify the question row and attempt row with the SQL checks in
    [Content Publishing Smoke Test](supabase-setup.md#content-publishing-smoke-test).
16. Run the [Cloud Image Storage Smoke Test](supabase-setup.md#cloud-image-storage-smoke-test)
    with an original PNG, JPEG, WebP, or GIF under 1 MB.
17. Confirm the image is stored through stable media references and renders for students only after
    the linked question is published.
18. Archive or delete the smoke questions.

Do not use AP, College Board, or third-party copyrighted images in smoke tests unless the owner has
confirmed usage rights. Do not upload video files to app storage; video explanations should remain
YouTube, Vimeo, or approved embed/link references for now.

Codex can verify public HTTP responses and local app behavior. Owner dashboard access is required
for SQL verification, invite/account confirmation, and any private production data inspection.

The dev-only local admin (`admin@studyprecalc.local` / `localadmin`) is not valid evidence for
production Storage or RLS. It uses browser-local fallback and cannot prove that Supabase Auth,
Storage, media metadata, admin MFA, or student visibility work in the cloud.

Evidence to keep:

- `npm run smoke:supabase` output, including `[PASS] validate_invite RPC`,
  `[PASS] anon unpublished content access`, `[PASS] question-images bucket`, and either
  `[PASS] admin login` plus MFA output when `SMOKE_ADMIN_MFA_CODE` is supplied, or a documented skip
  if admin smoke credentials were intentionally omitted.
- If write smoke is run, `npm run smoke:supabase` output showing `[PASS] cloud image write path`.
- SQL output from invite enforcement and content publishing checks.
- Screenshot/checkpoint showing the admin published an original smoke question.
- Screenshot/checkpoint from a separate student session showing the published question and cloud
  image render.
- SQL output showing linked `public.media_records` and `public.question_media` rows for
  `smoke-image-001`.
- Screenshot/checkpoint after archive showing the student can no longer see the smoke question.
- A note that all smoke questions, images, rubrics, and explanations are original throwaway content
  or have explicit owner-confirmed rights.
- A note that secrets were redacted before screenshots or logs were stored outside Git.

## 9. Roll Back If Needed

Owner, if production breaks:

1. In Vercel, open the project Deployments list.
2. Promote the last known-good deployment.
3. Re-run the domain HTTP checks from [Deployment Runbook](deployment.md#domain-deploy-checks).
4. Re-run owner login.
5. Re-run one student invite signup or practice persistence check if auth or data changed.

Evidence to keep:

- Vercel rollback deployment URL or promoted deployment ID.
- HTTP check output after rollback.
- Owner login and one student persistence checkpoint after rollback.

CLI option after Vercel login:

```sh
npx vercel promote <known-good-deployment-url>
```

If Supabase SQL caused the issue, do not guess at destructive fixes. Capture the failing query or UI
behavior, preserve the current database state, and prepare an explicit SQL repair plan before making
additional production changes.
