# Deployment Runbook

First public deployment target: Vercel.

For the ordered owner-facing M6 launch flow, start with
[M6 Production Activation Checklist](production-activation.md).

Complete [Supabase setup](supabase-setup.md) before relying on production accounts, invites,
published content, saved attempts, or dashboard persistence.

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

## Deploy From Vercel Dashboard

1. Push or import this repository into GitHub.
2. In Vercel, create a new project from that GitHub repository.
3. Confirm the build settings above.
4. Add the environment variables above.
5. Deploy.
6. Open the generated `*.vercel.app` URL.
7. Confirm the login screen says `Cloud account`.

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

App-level checks:

1. Open `https://studyprecalc.com`.
2. Confirm the auth screen says `Cloud account`.
3. Sign in as the owner admin.
4. Confirm the `Admin` badge, `Manage Content`, and `Classes` tabs are visible.
5. Create a class and student invite.
6. Run the content publishing smoke test in [Supabase setup](supabase-setup.md).
7. Sign up as a student with an invite in a different browser profile or private window.
8. Submit one practice attempt and confirm the dashboard updates.

Supabase Auth domain checks:

1. In Supabase Auth URL Configuration, set Site URL to `https://studyprecalc.com`.
2. Add redirect URLs for `https://studyprecalc.com/**`, `https://www.studyprecalc.com/**`,
   Vercel preview URLs, and local dev URLs as listed in [Supabase setup](supabase-setup.md).
3. If email confirmation is enabled, run one signup and confirm the email link returns to the
   production domain.

## Rollback

If production breaks after deploy:

1. In Vercel, open the project Deployments list.
2. Promote the last known-good deployment.
3. Re-run the domain HTTP checks.
4. Re-run one owner login and one student practice persistence check.

CLI rollback option:

```sh
npx vercel promote <known-good-deployment-url>
```

## References

- [Vercel Vite deployment](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Vercel custom domains](https://vercel.com/docs/domains/set-up-custom-domain)
- [Vercel inspect CLI](https://vercel.com/docs/cli/inspect)
