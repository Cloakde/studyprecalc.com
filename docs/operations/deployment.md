# Deployment Runbook

First public deployment target: Vercel.

For the ordered owner-facing M17/M18 launch flow, start with
[M17/M18 Production Activation Checklist](production-activation.md).

Complete [Supabase setup](supabase-setup.md) before relying on production accounts, invites,
published content, question image uploads, saved attempts, or dashboard persistence.

## Production Values

- Primary domain: `studyprecalc.com`
- Optional redirect domain: `www.studyprecalc.com`
- Supabase URL: `https://cwjmaxeaszaklbjwlvyg.supabase.co`
- Build command: `npm run build`
- Output directory: `dist`
- Framework preset: Vite

These build settings are also captured in `vercel.json`.

## Pre-Deploy Verification

Run these from the repository root before shipping a production deployment:

```sh
npm run validate:content
npm test
npm run lint
npm run build
```

Do not treat a build as ready for students until these pass on the branch or commit being deployed.

Evidence to keep: terminal output showing these commands passed on the exact commit deployed.

Do this before any Vercel deploy or redeploy. After the deploy is live, continue with Supabase smoke
and browser checks in [M17/M18 Production Activation Checklist](production-activation.md). Keep
secrets out of terminal captures and never commit `.env`.

Optional helper if present:

```sh
npm run check:production-readiness
```

This checks production env shape plus DNS/HTTP reachability. It supplements, but does not replace,
the Vercel dashboard, registrar, and live browser evidence.

## Vercel Environment Variables

Set these in the Vercel project for Production. Also set them for Preview and Development unless
you intentionally want local/preview builds to use browser-local fallback mode.

```txt
VITE_SUPABASE_URL=https://cwjmaxeaszaklbjwlvyg.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase publishable key or legacy anon public key>
```

Optional:

```txt
VITE_DESMOS_API_KEY=<Desmos API key>
```

Rules:

- Vite embeds `VITE_` variables into the static bundle at build time.
- `VITE_SUPABASE_ANON_KEY` must be browser-safe. Do not use a Supabase `service_role` key.
- Redeploy after changing any Vite variable.

Evidence to keep: Vercel Environment Variables screen showing the variable names are configured for
Production, plus the redeploy timestamp after the latest change.

## Deploy From Vercel Dashboard

1. Push or import this repository into GitHub.
2. In Vercel, create a new project from that GitHub repository.
3. Confirm the build settings above.
4. Add the environment variables above.
5. Deploy.
6. Open the generated `*.vercel.app` URL.
7. Confirm the login screen says `Cloud account`.

Evidence to keep: deployment URL, successful Vercel build status, and screenshot/checkpoint showing
`Cloud account` on the generated URL.

## Deploy From Vercel CLI

Use this route only after logging in to Vercel:

```sh
npx vercel login
npx vercel link
npx vercel --prod
```

The deploy command prints the deployment URL to stdout. Inspect the deployment immediately after
the command completes:

```sh
npx vercel inspect <deployment-url> --wait
```

If the build fails or behaves unexpectedly, inspect logs:

```sh
npx vercel inspect <deployment-url> --logs --wait
```

Evidence to keep: CLI deployment URL, `vercel inspect` success output, and any logs used to resolve
a failed deploy.

## Connect `studyprecalc.com`

Dashboard route:

1. In the Vercel project, open Settings -> Domains.
2. Add `studyprecalc.com`.
3. Add `www.studyprecalc.com` if the `www` host should work too.
4. Use the exact DNS records Vercel shows for each domain.
5. In the domain registrar DNS panel, remove conflicting old website records.
6. Add the Vercel-provided records.
7. Set `studyprecalc.com` as the primary domain.
8. Configure `www.studyprecalc.com` to redirect to the primary domain if Vercel offers that option.
9. Wait for Vercel to show the domain as configured.

Evidence to keep: Vercel Domains screen showing configured apex and `www` domains.

CLI route after `vercel link`:

```sh
npx vercel domains add studyprecalc.com <vercel-project-name>
npx vercel domains inspect studyprecalc.com
npx vercel domains add www.studyprecalc.com <vercel-project-name>
npx vercel domains inspect www.studyprecalc.com
```

Typical Vercel records are:

- Apex `A` record for `studyprecalc.com`: `76.76.21.21`
- `www` `CNAME` record: `cname.vercel-dns-0.com`

Use the values from the Vercel Domains screen or `vercel domains inspect` if they differ.

## Domain Deploy Checks

After DNS is configured and a production deployment is ready, run:

```powershell
Resolve-DnsName studyprecalc.com
Resolve-DnsName www.studyprecalc.com
```

Then run HTTP checks:

```powershell
$urls = @(
  "https://studyprecalc.com",
  "https://www.studyprecalc.com"
)

foreach ($url in $urls) {
  $response = Invoke-WebRequest -Uri $url -MaximumRedirection 5 -UseBasicParsing
  "$url $($response.StatusCode)"
}
```

Expected result: each URL resolves and returns HTTP 200 after redirects.

Evidence to keep: DNS command output and HTTP status output.

If `www.studyprecalc.com` is intentionally deferred, record that explicitly in the owner evidence
packet. Otherwise treat a missing `www` DNS/HTTP result as an unresolved launch blocker.

App-level checks:

1. Open `https://studyprecalc.com`.
2. Confirm the auth screen says `Cloud account`.
3. Sign in as the owner admin.
4. Complete the admin TOTP MFA gate if the session is not already `aal2`.
5. Confirm the `Admin` badge, `Manage Content`, and `Classes` tabs are visible.
6. Create a class and student invite.
7. Run the content publishing smoke test in [Supabase setup](supabase-setup.md).
8. Run the cloud image storage smoke test in [Supabase setup](supabase-setup.md) with an original
   PNG, JPEG, WebP, or GIF under 1 MB.
9. Sign up as a student with an invite in a different browser profile or private window.
10. Confirm published question images render for the student and unpublished or archived image-linked
    questions are not readable.
11. Submit one practice attempt and confirm the dashboard updates.

Use a real Supabase admin account for these checks. The local dev-only admin proves only
browser-local authoring and is not valid evidence for production Auth, Storage, RLS, MFA, or student
visibility. Admin UI gates should be treated as usability; RLS and Storage policies must also reject
admin writes unless the Supabase session is `aal2`.

Evidence to keep: admin MFA checkpoint, admin UI checkpoint, student private-window checkpoint,
Supabase smoke script output, SQL query results from the linked Supabase smoke tests, and dashboard
persistence checkpoint.

Use only original smoke questions and original or owner-approved images. Do not use AP, College
Board, or third-party copyrighted questions, images, rubrics, or explanations unless the owner has
confirmed rights. Do not include passwords, invite codes, TOTP seeds/codes, or Supabase service-role
keys in the saved evidence.

Supabase Auth domain checks:

1. In Supabase Auth URL Configuration, set Site URL to `https://studyprecalc.com`.
2. Add redirect URLs for `https://studyprecalc.com/**`, `https://www.studyprecalc.com/**`,
   Vercel preview URLs, and local dev URLs as listed in [Supabase setup](supabase-setup.md).
3. If email confirmation is enabled, run one signup and confirm the email contains a six-digit code
   that verifies in the app.

Evidence to keep: Supabase Auth URL Configuration screenshot/checkpoint and one successful
email-code verification checkpoint if email confirmation is enabled.

## Rollback

If production breaks after deploy:

1. In Vercel, open the project Deployments list.
2. Promote the last known-good deployment.
3. Re-run the domain HTTP checks.
4. Re-run one owner login and one student practice persistence check.

Evidence to keep: promoted deployment URL or ID, HTTP check output, owner login checkpoint, and one
student persistence checkpoint.

CLI rollback option:

```sh
npx vercel promote <known-good-deployment-url>
```

## References

- [Vercel Vite deployment](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Vercel custom domains](https://vercel.com/docs/domains/set-up-custom-domain)
- [Vercel inspect CLI](https://vercel.com/docs/cli/inspect)
