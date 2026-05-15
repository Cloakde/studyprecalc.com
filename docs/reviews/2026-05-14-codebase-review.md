# Codebase Review - 2026-05-14

**Author:** Claude
**Audience:** Codex (and any future agent picking up follow-up work)
**Status:** Findings only. No source edits made.
**Recalibration:** Updated after Codex response and Claude reply on 2026-05-14.

## Summary

Read-only audit of the React 19 + Vite + TypeScript + Supabase codebase. Two parallel review agents (bugs/security, code-quality/a11y) plus targeted manual reads. Findings filtered to real issues; cosmetic style nits and "this could be cleaner" suggestions are excluded.

Result after reconciliation: **18 actionable findings plus 1 WONTFIX audit note**, grouped into **Clusters A-E**. Cluster A is the cluster to land first.

Severity after recalibration:

- **Critical:** #2
- **Important:** #1, #3, #5, #6, #7
- **Medium:** #4, #12, #13, #14, H1, H2, H3
- **Low:** #9, #10, #11, #15, #16
- **WONTFIX:** #8

## Methodology

- Scope: `src/`, `supabase/schema.sql`, `scripts/`, `index.html`, plus the recent homepage additions (`src/app/components/Home.tsx`, `src/app/styles/home.css`, `src/app/styles/tokens.css`).
- Read-only - no source files modified during the review.
- Two general-purpose review agents ran in parallel, each capped to ~10 findings:
  - Agent A: auth, RLS, async patterns, scoring/attempt logic, schema validation, XSS.
  - Agent B: accessibility, type safety, performance, code smells.
- Manual verification on the highest-impact items (`MathText.tsx`, `accountStore.ts`, `SessionPractice.tsx`, `App.tsx` routing).
- Findings consolidated, deduplicated, prioritized, then recalibrated after Codex's response and Claude's reply.

## Findings

### Critical - fix before next deploy

#### 2. Supabase logout is fire-and-forget

`src/data/supabase/accountStore.ts:193-196`

```ts
const logout = useCallback(() => {
  setCurrentAccount(null);
  void supabase?.auth.signOut();
}, []);
```

If the network call fails, the refresh token stays in `localStorage` and the user is silently re-authenticated on the next page load.

**Fix:** Make `logout` async, `await signOut()`, surface errors, and clear local Supabase storage on failure.

### Important - real bugs or security/data-integrity hardening

#### 1. KaTeX rendering - `trust` is implicit, not explicit

`src/app/components/MathText.tsx:71-75`

Admin-authored math runs through `katex.renderToString` + `dangerouslySetInnerHTML` without `trust: false`. KaTeX's default is safe today, but relying on a library default for a security-sensitive path is fragile.

**Fix:** Pass `trust: false` explicitly. Pair with explicit `output: 'htmlAndMathml'` from finding #11.

#### 3. Optimistic content writes can lose updates / resurrect deleted records

`src/data/supabase/questionContentStore.ts:570-601` (`saveCustomQuestion`), plus `setCustomQuestionStatus` (~671) and `deleteCustomQuestion` (~603).

Writes mutate `contentRecordsRef.current` snapshots and fire async store calls without ordering. Rapid successive saves resolve out of order; the second save's `.then` can use a stale snapshot and resurrect a deleted record.

**Fix:** Per-question-id promise chain (queue keyed by id), or always reconcile against the server result rather than mutating the ref.

#### 5. Silent failures on attempt/session persistence

`src/data/supabase/attemptStore.ts:149-164`, plus `removeAttempt` / `clearAttempts` / `replaceAttempts` / `importAttempts` and `sessionStore.persistSession`.

All fire-and-forget with `void`. UI shows the attempt as saved while the network silently failed. `lastError` field exists but isn't surfaced for attempts.

**Fix:** Wire `lastError` into a banner in Review/Session, or retry/rollback on failure.

#### 6. `syncQuestionMediaLinks` has no rollback

`src/data/supabase/questionContentStore.ts:225-291`

Deletes all existing `question_media` rows, then inserts new ones. If the insert fails (RLS error, missing `media_record`), the question is left with no media links and the storage objects remain orphaned.

**Fix:** Upsert + delete-missing pattern in a stored procedure, or compensating cleanup on insert failure.

#### 7. Revoked invites disappear from admin UI

`src/data/supabase/inviteStore.ts:352-371`, `inviteFromSupabaseRow:~87-100`

`revokeInvite` updates `revoked_at` on the server but the client filters the invite out of state. `revoked_at` is never mapped onto the domain model, so admins can't audit revoked invites.

**Fix:** Add `revokedAt` to `InviteCodeRecord`, map it in `inviteFromSupabaseRow`, render revoked state in `AdminClassManager`.

### Medium - user-visible polish or lower-frequency data risks

#### 4. Local attempt store can clobber cross-tab writes

`src/data/localAttemptStore.ts:~339-340, ~381`

`saveAttempt` reloads from storage on every call. Same-tab writes are synchronous and cannot interleave in the originally described timer/manual-submit path, but two browser tabs with the same account can still write to the same `localStorage` key from stale baselines.

**Fix:** Add cross-tab coordination, such as a `storage` event listener that reconciles `attemptsRef.current`, or a write queue if future async storage is introduced.

#### 12. No `:focus-visible` styles anywhere

`src/app/styles/app.css`, `src/app/styles/home.css`

`grep -i 'focus|outline'` across all stylesheets returns zero `:focus-visible` rules. `tokens.css` defines `--sp-border-focus` but no rule uses it. Browsers that suppress the default outline can leave keyboard users with no visible focus indication.

**Fix:** Global `:focus-visible { outline: 2px solid var(--sp-border-focus); outline-offset: 2px; }` plus opt-outs where needed.

#### 13. ARIA tab pattern is incomplete

`src/app/components/AccountAuth.tsx:125-154` and `src/app/components/Home.tsx` difficulty selector.

Buttons carry `role="tab"` and `aria-selected` but there's no `aria-controls`, no `role="tabpanel"`, no arrow-key handler. Screen-reader users get broken contracts.

**Fix:** Drop the tab role (plain buttons work) or complete the pattern. The Home difficulty selector probably wants plain buttons since the "panel" is the whole sample card.

#### 14. Catches swallow errors silently

Several catch blocks across `src/data/**` intentionally or accidentally suppress failures. Some UI paths already surface errors through state, so this should be fixed with targeted reporting rather than blanket logging.

**Fix:** Add a small `reportError(scope, error)` helper and call it from currently silent data-layer paths where failures are not otherwise surfaced.

### Homepage findings

#### H1. Hidden radio choices have no visible keyboard focus

`src/app/components/Home.tsx`, `src/app/styles/home.css`

The homepage sample question renders real radio inputs, then styles those inputs as transparent/absolute. The input receives focus, but the visible `.choice-option__letter` and choice row do not show focus.

**Fix:** Add a visible `:focus-visible` or `:focus-within` state on the visible choice control, for example `.choice-option:focus-within .choice-option__letter`.

#### H2. Homepage difficulty selector uses an incomplete tab pattern

`src/app/components/Home.tsx`

The difficulty selector uses `role="tablist"`, `role="tab"`, and `aria-selected` without a matching `tabpanel`, `aria-controls`, roving `tabIndex`, or arrow-key behavior. The sample card is a single dynamic preview, so a plain segmented-button pattern is a better fit.

**Fix:** Remove tab roles and use plain buttons with `aria-pressed={sampleDifficulty === label}`, or implement a complete tab pattern if this becomes a real tabbed interface.

#### H3. Homepage copy claims content the app does not ship

`src/app/components/Home.tsx`

The homepage stats band claims `84+ Questions ready` and `100% Worked solutions`, but the bundled question bank is intentionally empty per CONTENT-004 and current project status. A new user can sign in and see zero available questions.

**Fix:** Replace the count/stat claims with truthful feature-statement copy that remains accurate while the bank is empty, or gate live counts on real published content.

### Low - cleanup and hardening

#### 9. `SessionPractice` ref-sync effect has no dep array

`src/app/components/SessionPractice.tsx:250-252`

```tsx
useEffect(() => {
  submitSessionRef.current = submitSession;
});
```

No dep array means this runs every render. With a 1-second clock interval the component re-renders constantly, so this assignment fires every second.

**Fix:** Add `[submitSession]` deps, or wrap `submitSession` in `useCallback` and assign the ref only when it changes.

#### 10. KaTeX is re-rendered on every keystroke in ContentManager preview

`src/app/components/MathText.tsx:71` (caller-side in `ContentManager.tsx`)

`katex.renderToString` is called for every math segment on every render. Authoring a question re-parses the entire prompt + every choice on each character typed.

**Fix:** Module-level `Map<(text, displayMode), string>` cache, or `useMemo` per segment.

#### 11. Math screen-reader output should be explicit

`src/app/components/MathText.tsx:71-86`

KaTeX currently emits MathML by default (`htmlAndMathml`), so the original "math is invisible to screen readers" description was overstated. This remains useful hardening because explicit output documents the accessibility contract and an `aria-label` fallback can help screen readers with uneven MathML support.

**Fix:** Pass `output: 'htmlAndMathml'` explicitly and consider an `aria-label` containing the raw LaTeX as a redundant fallback.

#### 15. Duplicated helpers across stores

`toIsoTimestamp` is defined 7x across `domain/`, `data/local*`, and `data/supabase/*`. Same for `isObject`, `stringOrUndefined`, `timestampOrDefault`. A fix in one doesn't propagate.

**Fix:** Hoist into `src/domain/shared/json.ts` (or similar) and import from both stores.

#### 16. `ContentManager.tsx` is 1868 lines

One file holds the editor, importer, image/video uploader, asset draft logic, readiness checks, and live preview. `linesToList(draft.explanationSteps)` is called four times per render.

**Fix:** Split into `QuestionPreviewPanel`, `AssetEditor`, and a `useQuestionDraft` hook. Memoize the `linesToList` results.

### WONTFIX

#### 8. Profile role updates are column-restricted - WONTFIX

`supabase/schema.sql:434-447`, `supabase/schema.sql:508-509`

The original review flagged the broad RLS update policy on `profiles`, but column-level grants prevent authenticated clients from updating `role` through PostgREST:

```sql
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;
```

Role changes happen through the `claim_invite` SECURITY DEFINER function, which is the intended path.

**Reason:** Column grants restrict authenticated clients to `display_name` updates only; admin promotion happens via `claim_invite`.

## Non-issues (flagged for context, not fixes)

- **Local-first browser-scoped storage is intentional.** Local password hashing (SHA-256 + per-user salt, single round) is acceptable for the documented threat model. Flag for the threat model doc, not a code fix.
- **App.tsx routing** with `unauthView` and `canManageContent` is sound (verified). The duplicate dep `[currentAccount?.id, currentAccount]` on `App.tsx:168` is redundant but harmless.
- **RLS scoping** on `attempts`, `session_results`, `class_enrollments`, `media_records`, `question_media` looks correct per-user/per-role.

## Recommended Work Groups

The reconciled findings split cleanly into five shippable clusters:

### Cluster A - Security and data integrity

Items: **2, 3, 6, 1**.
Estimate: half a day.
Land first. Single PR.

### Cluster B - Homepage polish

Items: **H3, H1, H2, 12**.
Estimate: a couple hours.
Land before any production marketing of the URL.

### Cluster C - Persistence error visibility

Items: **5, 14, 7**.
Estimate: one day.
Mostly UI plumbing once targeted error reporting exists. Land after A.

### Cluster D - Lower-priority polish

Items: **4, 13, 11, 9, 10**.
Estimate: half a day.
Independent of A and C; can run in parallel after the higher-risk fixes are claimed.

### Cluster E - Defer

Items: **15, 16**.
Estimate: one day.
No correctness blockers. Pure refactor.

## Coordination

This doc is the source of truth for the audit after the Codex/Claude reconciliation. Per item, the **Fix** line is a starting direction, not a prescriptive design; feel free to deviate if you see a better approach.

When picking a cluster:

1. Update [`.ai/task-board.md`](../../.ai/task-board.md) if the task state changes.
2. Claim scope in [`.ai/status.md`](../../.ai/status.md) unless the user has scoped a read-only or docs-only pass differently.
3. Drop a note in [`.ai/messages/from-codex.md`](../../.ai/messages/from-codex.md) or [`.ai/messages/from-claude.md`](../../.ai/messages/from-claude.md) when coordination is needed.
4. As findings are addressed, tick them off here by changing the section heading from e.g. `#### 2. Supabase logout is fire-and-forget` to `#### 2. Supabase logout is fire-and-forget - DONE (PR #N)`.

If a finding turns out to be wrong on closer inspection, mark it `WONTFIX` here with a one-line reason rather than silently dropping it; the audit history matters.

## Out of scope for this audit

- The bundled empty seed bank (intentional per CONTENT-004), except where homepage copy claims content availability.
- The deferred desktop target (intentional per DEC-004).
- Production deploy steps and Supabase activation; those are tracked in `docs/operations/deployment.md` and the M8 phase notes in status.md.
- Visual QA of the new homepage; needs to happen at deploy time against the real production layout, not during this audit.
