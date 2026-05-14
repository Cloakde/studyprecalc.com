# 0008 - Vercel First Web Deploy

## Status

Accepted

## Context

The app is web-only for now and is built as a Vite static bundle. The owner bought `studyprecalc.com` and wants convenient access to the current in-progress build before the app is ready for students.

## Decision

Use Vercel as the first public deployment target for the current app.

The project will keep Supabase as the backend and expose only browser-safe Vite environment variables in the hosted build:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_DESMOS_API_KEY` when Desmos is enabled

## Consequences

- The app can be deployed from the current Vite build with `npm run build` and `dist`.
- `studyprecalc.com` can point at the latest production deployment once the Vercel project exists.
- The deployment can be swapped later to Cloudflare Pages or another static host without changing the app architecture.
- Supabase SQL setup still has to be completed before cloud accounts and saved progress work correctly in production.
