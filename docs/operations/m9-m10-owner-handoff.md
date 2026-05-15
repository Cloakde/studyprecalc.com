# M9/M10 Owner Handoff

Use this as the final owner-facing handoff for M9 production activation preflight and M10 admin
content workflow QA. The detailed runbooks remain:

- [Production activation](production-activation.md)
- [Deployment](deployment.md)
- [Supabase setup](supabase-setup.md)

## Operating Contract

- M9 proves the production stack is ready: local checks, Supabase schema/storage/auth/MFA, Vercel
  env vars, deployment, domain, and smoke output.
- M10 proves the admin content workflow is ready: draft, publish, archive, student visibility,
  dashboard persistence, and image upload/render/deny-after-archive.
- Codex can verify repository checks, local smoke commands, and public HTTP/DNS after deployment.
- The owner must complete Supabase, Vercel, registrar, inbox, and production account actions that
  require dashboard access or real credentials.
- Keep secrets, invite codes, passwords, TOTP seeds, screenshots with private values, and Supabase
  service-role keys out of Git.

## Evidence Packet

Keep this evidence outside the repository:

- Deployed commit SHA and Vercel deployment URL.
- Terminal output for `npm run validate:content`, `npm test`, `npm run lint`, and `npm run build`.
- Supabase SQL Editor success for `supabase/schema.sql`.
- Supabase verification query output for required tables, RLS policies, and the private
  `question-images` bucket.
- Supabase Auth settings showing the `studyprecalc.com` Site URL, redirect URLs, and email-code
  template with `{{ .Token }}` if email confirmation is enabled.
- Vercel Production environment variable screen showing `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY`, plus redeploy timestamp after any variable change.
- DNS/HTTP output showing `https://studyprecalc.com` and `https://www.studyprecalc.com` return 200
  after redirects.
- Owner admin evidence: consumed admin invite, `profiles.role = 'admin'`, verified TOTP factor,
  `aal2` admin session, and Admin / Manage Content / Classes visible in the deployed app.
- `npm run smoke:supabase` output. If write smoke is run, include the `[PASS] cloud image write path`
  output.
- M10 admin content evidence from the smoke steps below.

## M9 Activation Pass

1. Run local verification on the deployment commit:

   ```sh
   npm run validate:content
   npm test
   npm run lint
   npm run build
   ```

2. In Supabase, run `supabase/schema.sql` and save the verification query results from
   [Supabase setup](supabase-setup.md#verify-sql-setup).
3. Bootstrap or verify the owner admin account, complete TOTP MFA, and confirm the session reaches
   `aal2`.
4. In Vercel, set Production `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; never use a
   `service_role` key. Redeploy after any `VITE_` variable change.
5. Deploy the production build and confirm the sign-in screen says `Cloud account`.
6. Connect `studyprecalc.com`, then run DNS and HTTP checks from
   [Deployment](deployment.md#domain-deploy-checks).
7. Run `npm run smoke:supabase` against the production Supabase project. Add admin/student smoke
   credentials and `SMOKE_WRITE=1` only when the owner intentionally wants the write path tested.

## M10 Admin Content Smoke

Use only original throwaway content. Do not use AP, College Board, or third-party questions,
rubrics, diagrams, or images unless the owner has confirmed usage rights.

Text lifecycle smoke:

1. Sign in on the deployed app as a real Supabase admin and complete the MFA gate.
2. Open `Manage Content` and create a text-only MCQ with a unique ID such as
   `smoke-publish-YYYYMMDD`.
3. Save as draft, refresh the library, and confirm the admin can still see the draft.
4. Confirm a student session cannot see the draft.
5. Publish the question, refresh the library, and verify the Supabase row has `status = 'published'`
   and `is_published = true`.
6. In a private window or different browser profile, sign in as a real student, confirm the question
   appears in `Practice`, submit one attempt, and confirm the Dashboard updates.
7. Verify the student attempt row in Supabase.
8. Archive the smoke question, refresh the student session, and confirm the question is no longer
   visible.

Image smoke:

1. Use one original PNG, JPEG, WebP, or GIF under 1 MB.
2. As the MFA-verified admin, upload the image to a draft question.
3. Save draft, refresh, and confirm the admin can still see the image.
4. Publish the question and confirm a real student can see the image in `Practice`.
5. Verify linked `media_records` and `question_media` rows for the smoke question.
6. Archive the question and confirm the student can no longer see the question or linked image.
7. Optionally run the automated write smoke with `SMOKE_WRITE=1` and real admin/student smoke
   credentials.

## Owner-Only Blockers

Block launch until the owner resolves any of these:

- Supabase SQL has not been run, or `validate_invite`, `questions`, `media_records`,
  `question_media`, or `question-images` are missing.
- The `question-images` bucket is public, over 1 MB, or allows formats beyond PNG, JPEG, WebP, and
  GIF.
- Vercel Production env vars are missing, use the wrong Supabase project, use a service-role key, or
  were changed without redeploying.
- `studyprecalc.com` or `www.studyprecalc.com` is not configured in Vercel/DNS or does not return
  HTTP 200 after redirects.
- Supabase Auth Site URL, redirect URLs, or email-code template are missing or point at the wrong
  production domain.
- The owner admin invite/account is not consumed, does not have `role = 'admin'`, or has not
  completed TOTP MFA to `aal2`.
- No real student account exists for visibility, attempt persistence, dashboard, or image access
  checks.
- Any production evidence depends on the local dev admin, browser-local fallback data,
  `local-image:<id>` references, or unconfirmed copyrighted content.
