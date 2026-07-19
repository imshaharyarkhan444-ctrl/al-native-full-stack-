# DocFlow

A lightweight collaborative document editor — create, edit, upload, and share
documents with rich-text formatting. Built with Next.js 14 (App Router),
TipTap, Prisma, and Tailwind CSS.

## Tech stack

| Layer       | Choice                                   |
|-------------|-------------------------------------------|
| Framework   | Next.js 14 (App Router) + TypeScript       |
| Editor      | TipTap (ProseMirror)                       |
| DB / ORM    | Prisma + SQLite (local), Postgres/Turso (deployed) |
| Auth        | Mocked, session-cookie user switching      |
| Styling     | Tailwind CSS                               |
| Tests       | Vitest                                     |

No deviations from the requested stack.

## Local setup

Requirements: Node 18+.

```bash
npm install
cp .env.example .env          # already points at a local SQLite file
npm run db:migrate            # creates prisma/dev.db and applies the schema
npm run db:seed               # seeds 4 demo users + sample documents/shares
npm run dev                   # http://localhost:3000
```

`npm run db:migrate` will prompt you to name the first migration the first
time you run it (e.g. `init`) — that's normal Prisma behavior, not an error.

## Demo users

No passwords. The login screen lists all seeded users — click one to sign in
as them. Switch users any time via "Switch user" on the dashboard.

| Name          | Email                  |
|---------------|-------------------------|
| Ava Chen      | ava@docflow.dev         |
| Marcus Reed   | marcus@docflow.dev      |
| Priya Nair    | priya@docflow.dev       |
| Sam Okafor    | sam@docflow.dev         |

To see sharing in action out of the box: **Ava** owns "Q3 Planning Notes"
and has shared it with **Marcus** (edit) and **Sam** (edit — the seed sets
both to edit; you can flip Sam to view-only from the Share modal to see the
read-only state). **Marcus** owns "Marcus's Design Journal" and has shared
it with **Ava**. **Priya** has a private, unshared document.

## Supported file upload formats

- `.txt` — each non-blank line becomes a paragraph.
- `.md` — a minimal, dependency-free parser handles `#`/`##` headings,
  `-`/`*` bullet lists, and `1.` numbered lists; everything else becomes a
  paragraph.

**Explicitly out of scope:** `.docx`, `.pdf`, `.html`, and inline Markdown
formatting (`**bold**`, `_italic_`, links, images, tables). Uploading an
unsupported extension returns a clear error instead of silently failing.
Max upload size is 1MB.

## Sharing model

- Every document has exactly one **owner**.
- The owner can share with any other seeded user and choose **"Can edit"**
  or **"View only"** per person.
- **Decision:** shared users default to **edit** access when you add them
  (matching how most lightweight doc tools default), but the owner can pick
  view-only explicitly in the Share modal. Only the owner can manage sharing
  (add/remove people) — collaborators with edit access can change content
  but not the document's audience.
- Dashboard splits documents into "My Documents" (owned) and "Shared With
  Me" (has a Share record), with a badge showing your permission level.

## Running tests

```bash
npm test
```

Covers:
- `tests/permissions.test.ts` — pure unit tests of the access-control logic
  (owner/edit/view resolution, who can manage sharing, denial cases).
- `tests/persistence.test.ts` — an integration test against a real,
  throwaway SQLite database that proves documents/users/shares survive a
  create → read → update → read round trip, including the upsert-not-
  duplicate behavior of re-sharing with the same user.

## Deployment (Vercel)

SQLite's file-based storage doesn't survive Vercel's ephemeral serverless
filesystem, so the schema is written to be provider-agnostic and the
deployed instance should point at a hosted database instead:

- **Turso** (LibSQL, SQLite-compatible) — closest to local dev. Swap the
  Prisma `datasource` provider is not required if you use the Turso Prisma
  driver adapter; otherwise the simplest path is switching `provider` to
  `postgresql` and using Neon/Supabase (see below), since as of this
  project's Prisma version the native Turso adapter setup is a bit more
  involved than a one-line config change.
- **Neon or Supabase (Postgres)** — recommended for the deployed version.
  Change `datasource db { provider = "postgresql" }` in
  `prisma/schema.prisma`, set `DATABASE_URL` in Vercel's project settings
  to the connection string Neon/Supabase gives you, then run
  `npx prisma migrate deploy` against it once before first deploy.

This tradeoff (SQLite locally, hosted Postgres in prod) is deliberate and
called out again in `ARCHITECTURE.md`.

**Manual steps you'll need to do yourself** (not something I can do from
here):
1. Create a Vercel account/project and connect this repo.
2. Create a Neon or Supabase Postgres database (or a Turso database) and
   copy its connection string.
3. Set `DATABASE_URL` as an environment variable in the Vercel project.
4. Change the `provider` in `prisma/schema.prisma` to `"postgresql"` if
   using Neon/Supabase, commit, and redeploy.
5. Run `npx prisma migrate deploy` (or `db push` for a quick demo) once
   against the production database before the app can serve real requests.
6. Re-run the seed script against production if you want the same demo
   users there (`DATABASE_URL=<prod-url> npm run db:seed`).

## Known limitations

- Auth is intentionally mocked — no passwords, no real session security.
  Not suitable for a real deployment without swapping in real auth.
- No real-time collaborative editing (no CRDT/WebSocket sync) — this is a
  single-editor-at-a-time model with autosave, not simultaneous co-editing
  like Google Docs. Two people editing the same doc at once will overwrite
  each other's autosave on save, last write wins.
- Markdown upload parsing is minimal (structural elements only, no inline
  formatting, no tables/links/images).
- No document version history (see `SUBMISSION.md` for what a next pass
  would add).
- The Prisma engine binary could not be downloaded inside the sandboxed
  environment this was built in (no network access to
  `binaries.prisma.sh`), so `npm run build` / `next dev` could not be
  runtime-verified there. TypeScript compiles cleanly (`tsc --noEmit`) and
  `next build` completes the full compile + type-check step successfully;
  it only fails at the Prisma-Client-instantiation step, which requires
  network access this sandbox didn't have. This will run normally with
  `npm install` on a machine/CI with normal internet access — see
  `AI_WORKFLOW.md` for how this was verified.
