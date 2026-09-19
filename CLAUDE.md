# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm install
npm run dev      # dev server on http://localhost:3000
npm run build    # production build (also the only type-check: tsconfig has noEmit)
npm start        # serve the production build
npm run lint     # eslint (flat config, eslint-config-next core-web-vitals + typescript)
```

```sh
npm run invite -- +923001234567 "Their name"   # create an account, print its link and password
npm run invite -- +923001234567 --reset        # issue a new password
```

There is no test runner or test directory. `lib/family.ts`, `lib/layout.ts` and `lib/cloud.ts` are deliberately React-free so they *could* be tested, but nothing is wired up — adding a test means bringing the runner too.

Next.js 16 / React 19 / Tailwind v4 / TypeScript strict. Import alias `@/*` → repo root. Tailwind has no config file; design tokens live in the `@theme` block of [app/globals.css](app/globals.css).

## Architecture

**Local-first, with Supabase behind it.** Still no API routes and no server components doing data work: the browser talks to Supabase directly. The whole app state is one `AppData` object (`{version, trees[], settings}`) held in a React context and mirrored to `localStorage` under `family-tree-app/v1/<phone>`, and each changed tree is pushed to the `family_trees` table about a second later. Pages under [app/](app/) are `'use client'`; the only server component is [app/layout.tsx](app/layout.tsx), which just loads fonts and mounts the providers.

localStorage is the working copy — it is what makes the app instant, offline-capable and undoable. Postgres is the durable copy. **Reads during normal use never go to the network**; only sign-in pulls.

Provider order, set in [app/layout.tsx](app/layout.tsx): `AppProvider` → `ToastProvider` → `LocaleShell` → `AuthGate`. `LocaleShell` renders a spinner until the store has read localStorage and checked for a session, which is what prevents an English/LTR flash for an Urdu user — don't render app chrome above it. `AuthGate` then shows the sign-in screen instead of the requested page whenever `activeNumber` is null, so every page under [app/](app/) may assume a number is open — **except `/shared/*`**, which `AuthGate` lets through by pathname because a shared link has to open for somebody with no account.

**Without `NEXT_PUBLIC_SUPABASE_*` set, the app falls back to local-only** — `supabase()` returns null, `cloudOn` is false, and a number becomes a label again with no password asked for. That path is load-bearing, not dead code: it is also what a dead network looks like. Don't make any of it throw on a null client.

### The number is a credential now, but nobody signs themselves up ([lib/accounts.ts](lib/accounts.ts), [scripts/invite.mjs](scripts/invite.mjs))

Phone + password through Supabase Auth. **There is deliberately no signup path, no OTP and no SMS provider**: the owner runs `scripts/invite.mjs`, which creates the user and prints a link and a password to pass on by hand. Don't add a "create account" button or reach for Twilio/SMTP without being asked; the SignIn screen explains the absence instead (`noAccountBody`).

**The account is an email address underneath.** Auth goes through the *email* provider under an address derived from the number (`+923001234567` -> `923001234567@familytree.local`), created with `email_confirm: true` so nothing is ever sent. The phone provider was the obvious choice and was rejected: it cannot be enabled without paying for an SMS sender this app would never use. The reasoning is written out above `authEmailFor` in [lib/accounts.ts](lib/accounts.ts) — read it before "simplifying" this back to `signInWithPassword({ phone })`, which fails with `phone_provider_disabled`.

- `authEmailFor` / `phoneFromAuthEmail` are the mapping, and `scripts/invite.mjs` **duplicates it** (two lines, no TS build step there) — they must agree or nobody can sign in.
- The domain is `.local`, not `.invalid`. `.invalid` is the more obvious reserved choice and Supabase **rejects it** (`email_address_invalid`); this was found by testing against the live project, not from the docs. Verify against a real project before changing it.
- Accounts can only be made with the service role key, via `admin.createUser({ email_confirm: true })`. The public signup endpoint is not an alternative: it tries to send a confirmation mail and dies on the built-in SMTP rate limit (`over_email_send_rate_limit`).
- The mapping is only reversible because `isE164` has already made the number canonical. That is why sign-in refuses a number without a country code rather than guessing one.
- Session restore reads the number back out of `user.email`, not `user.phone`, because a `family_accounts` row is optional. A session whose address is not ours is treated as signed out rather than guessed at.
- **The user must never see the derived address.** It is an implementation detail; every screen shows the phone number.

- `normalizePhone` keeps digits and a leading `+` only, so `0300 123-4567` and `03001234567` reach the same families. **A country code is never inferred**, and `isE164` enforces that at sign-in by *asking* rather than guessing: guessing wrong would aim somebody at a stranger's account. The invite link carries `?n=<phone>`, so the common path never types it.
- The registry (`family-tree-app/accounts/v1`) holds the number list, who is open, and a copy of the settings. That copy exists because the sign-in screen has no `AppData` to read the language from — `setLocale`/`setTextScale` write both (and the roster row), so signing out doesn't flip an Urdu reader back to English.
- `signIn` reads the number's own data through the same `coerce()` as a file import, resets the undo stack, and — for the first number ever used on the device — claims whatever sat under the old `family-tree-app/v1` key so no tree is lost to the upgrade. Settings from `family_accounts` win over the device's, so a language choice follows the person to a new phone.
- Tapping a saved number now only *fills it in* — the number alone no longer opens anything.
- `family_accounts.is_active` revokes access without deleting anything; `signIn` checks it and refuses with `'inactive'`.
- Signing out and forgetting a number are both non-destructive: the data stays under its key and in the cloud, and comes back when the number is typed again. Say that in the confirm text.

### The store is the only way to mutate ([lib/store.tsx](lib/store.tsx))

Every write goes through the internal `mutate(fn, recordUndo = true)`, which pushes a JSON snapshot of the previous state onto an undo stack (cap 40) and deep-clones before applying. Two rules follow:

- **Never mutate `tree.people` outside the store.** State is structurally shared through `JSON.parse(JSON.stringify(...))`; in-place edits elsewhere break undo.
- **Pass `recordUndo = false` for anything that isn't content.** `setTreeField` (rootId/focusId — i.e. navigation) and the settings setters already do. Putting a view change on the undo stack makes Undo feel broken.

Invariants the store maintains, which new code must not skip:

- `repair()` from [lib/family.ts](lib/family.ts) runs after every people-list change. It dedupes ids, drops dangling parent/spouse references, makes marriages symmetric, and breaks ancestry cycles. Imported and hand-edited files are repaired, never rejected — `coerce()` applies the same treatment to anything read from a file or from storage.
- `liftRoot()` walks `tree.rootId` up to the oldest recorded ancestor after each add, so adding a grandfather re-roots the chart on him. The chart only draws downwards; this is why nobody has to find the "Start from" control.
- `importFile` **merges** by tree id rather than replacing — a restore must not wipe trees built since the backup. `mergeTrees` in [lib/cloud.ts](lib/cloud.ts) applies the same rule to syncing, for the same reason.

### Syncing ([lib/cloud.ts](lib/cloud.ts))

One row per tree, with `people` stored as one jsonb document rather than normalised into rows — so `repair()`/`coerce()` stay the only code that understands the shape, and a sync is one upsert per tree rather than a diff per person. Rows coming back go through `repair()` exactly as imported files do.

- **A sync never destroys a tree.** `mergeTrees` keeps anything either side has; `updatedAt` (the device's own timestamp, not `synced_at`) settles a conflict, and ties go to the local copy because that is what the user is looking at. Deleting on the device deletes the row too, but a tree that merely went missing is restored, not deleted. There are no tombstones — that is a known limit, not an oversight.
- The push effect debounces by `PUSH_DELAY_MS` and compares against `cloudSeen`, a ref of what the cloud last showed us, so typing a name is one request. Writing a returned `cloudUid` back into state must not touch `updatedAt` or the undo stack, or syncing pushes itself in a loop.
- `setTreePublic` passes `recordUndo = false` and leaves `updatedAt` alone — sharing is a decision about a tree, not an edit to it. `treesToPush` therefore checks `isPublic` separately.
- RLS is `owner_id = auth.uid()` for everything, plus one anon `select` for `is_public` rows. The public read is the *only* thing an unauthenticated visitor can do; keep it that way.

### Relationship rules ([lib/family.ts](lib/family.ts))

`attach(people, added, kind, toId)` encodes the "Add son" / "Add wife" / "Add father" semantics: it infers the second parent when the anchor has exactly one spouse, presumes a newly added father is the husband of a known mother, and copies both parent links for a brother or sister. This is why the add form asks only for a name — the relationship is already known. New relationship kinds go in `RelationKind` + `RELATION_GENDER` + the `attach` switch together.

### Chart layout is two-phase ([lib/layout.ts](lib/layout.ts), [components/ChartView.tsx](components/ChartView.tsx))

1. `buildTree(people, rootId, collapsed)` decides structure: each person appears exactly once, under their father when the father is in the chart and under their mother otherwise (that fallback is what keeps grandchildren attached when a father married in from outside).
2. ChartView renders cards off-screen, measures their real `offsetHeight`, then calls `positionTree(built, heights, collapsed)` for coordinates.

Card width is fixed (`CARD_W`), which is the assumption that keeps positioning collision-free — a parent centred over its children can't be wider than their span. Variable-width cards would require a real tree-layout algorithm. Spouses get no card of their own; they're listed on the partner's card, which is why 33 people draw 22 cards in the sample.

### Bilingual + RTL ([lib/i18n.ts](lib/i18n.ts))

`t(locale)` returns the whole string table; `displayName`/`altName` pick which of a person's two names is primary. `LocaleShell` sets `lang`, `dir` and `--text-scale` on `<html>` from the saved settings.

- **`t()` casts to `Strings`, so a key missing from the `ur` table is not a type error** — it silently returns `undefined` at runtime. Add every new string to both tables.
- Layout flips by `dir` alone: use logical CSS properties (`padding-inline`, `inset-inline`, `ms-*`/`me-*`) and never `left`/`right`.
- Urdu is set in Noto Nastaliq via `:lang(ur)` rules in globals.css with much larger leading. Don't set `font-family` or tight `line-height` on text that may be Urdu.

### Constraints from the intended user

This app is built for a non-technical, possibly elderly user reading English or Urdu, and most of the design follows from that. Preserve these when touching UI:

- The **Family view** (one person, parents above, spouse beside, children below) is the default, not the chart. Tapping a relative walks to them.
- Empty relationships render as labelled `+ Add mother` buttons in the slot, not as blank space.
- Nothing is icon-only; every control carries words. Minimum tap target 3rem via the `tap` utility in globals.css.
- Everything sizes in `rem` off `--text-scale`, so the Settings text-size control scales the whole interface. Avoid `px`.
- Destructive actions confirm in plain language, say what happens to everyone else, and surface an Undo action in the toast (`useToast` from [components/Toast.tsx](components/Toast.tsx)).
- Sign-out is a visible button on the families screen as well as in Settings (`SignOutButton`), because a shared tablet gets handed on several times a day.
- The four views take a `readOnly` prop for the shared-link page. Controls that cannot work are **removed, not disabled** — for this user a dead button is worse than no button. `FamilyView`/`PersonSheet` swap `AddSlot`/`AddChip` for a null-rendering stand-in rather than guarding each use, several of which sit inside a ternary.
- Adding a relative keeps the user where they are, so several children can be entered in a row.

### Data shapes ([lib/types.ts](lib/types.ts))

`normalizePerson()` fills in every optional field, so views never guard for `undefined`. Dates (`birth`/`death`) are free text on purpose — `1952`, `c. 570 CE` and `11 AH / 632 CE` all valid, nothing parses them; sibling order falls back to insertion order for that reason.

`Tree.isPublic` and `Tree.cloudUid` are optional so old backup files still load; `cloudUid` is the `family_trees.uid` a share link points at, and is null until the tree has synced once.

The backup file format is the `AppData` JSON verbatim and is documented in [README.md](README.md); bumping `version` means teaching `coerce()` to read the old shape.

### The sample tree ([lib/seed.ts](lib/seed.ts))

**The Malik Family** — an invented Punjabi family, 33 people over five generations, carrying `isSample: true` and a fixed id (`SAMPLE_TREE_ID`). Otherwise an ordinary tree the user can edit or delete.

It is deliberately fictional filler and may be changed freely — but it is *shaped* to cover the awkward paths, so check the file header before trimming it. It deliberately includes a man with two wives (the spouse list on a card), a son-in-law with no recorded parents (the `buildTree` under-the-mother fallback), somebody unmarried and somebody childless (empty `+ Add ...` slots), and dates in several formats. Removing those cases removes the only coverage they have.

Earlier versions shipped the lineage of Prophet Muhammad ﷺ as the sample; it was removed deliberately, so don't reinstate it.
