# AI Workflow Notes

I built DocFlow with Claude doing the actual code generation, working
module by module the way the assignment asked: schema first, then CRUD,
then the editor, then upload, then sharing, then tests, then docs. Here's
what actually happened, not the polished version.

## Where AI materially sped things up

- **Boilerplate I'd otherwise copy-paste from an old project**: the Next.js
  App Router file layout, Prisma client singleton pattern (the
  `globalThis` trick to survive hot reload in dev), Tailwind/PostCSS
  config, `.gitignore`. None of this is interesting to write by hand every
  time, and AI got it right on the first pass.
- **The permission-resolution logic** (`lib/permissions.ts`). I described
  the rule in one sentence — owner beats share, share permission beats
  nothing, view can't manage sharing — and got back a pure function with
  the exact signature I'd have written myself, plus it proactively kept it
  framework-free so it's trivially unit-testable. That's the single most
  important piece of logic in the app (it's what stands between "Priya's
  private draft" actually staying private and it not), and having it
  isolated instead of scattered across API route `if` statements was a
  better structure than I'd have defaulted to under time pressure.
- **The TipTap toolbar and editor wiring**. I don't have TipTap's exact
  API surface memorized (chain().focus().toggleBold().run(), the specific
  extension imports for StarterKit vs. Underline). Getting that right
  without trial-and-error against the docs saved real time.
- **The minimal Markdown-to-TipTap-JSON parser** (`lib/fileParser.ts`). I
  asked for headings/bullets/numbered-lists only, explicitly no inline
  formatting, and got a small dependency-free parser instead of it
  reaching for a full Markdown library — which is what I wanted, since
  pulling in `marked` + a Markdown-to-ProseMirror bridge for three list
  types would've been overkill.

## What I changed or rejected

- The first pass of the sharing API let *any* collaborator with edit
  access re-share the document with other people. I rejected that —
  edit access to content shouldn't imply control over who else gets
  access — and had it changed so only the owner can manage sharing
  (`canManageSharing()` explicitly checks for `"owner"`, not `"edit"`).
  This is called out in ARCHITECTURE.md as a deliberate decision, not an
  accident.
- I pushed back on an early version of the persistence test that only
  tested the file-parsing function in isolation and called that "the
  persistence test." That's not persistence — that's a pure function test
  I already had in the permissions suite's spirit. I asked for a test that
  actually round-trips through Prisma against a real (throwaway) SQLite
  database — create, read back, update, read back again, plus the
  share-uniqueness/upsert behavior — because that's the thing that's
  actually load-bearing for "does this app persist data correctly," and a
  parser unit test doesn't prove that.
- Default share permission: I had it default new shares to "edit" (with an
  explicit "view only" option in the UI) rather than defaulting to "view"
  and making people find an edit toggle. That's a UX call I made, not a
  technical constraint — a reviewer testing sharing wants to see the edit
  path work with the least friction.
- I explicitly told it not to attempt `.docx` upload parsing or CRDT-based
  real-time editing, both of which would have eaten the whole time budget
  for a feature that wasn't top of the stated priority list. Scope cuts
  are documented, not silently dropped.

## How I verified correctness/UX/reliability

- **Types**: `npx tsc --noEmit` run to completion, clean, with the actual
  Prisma-generated types (not `any`-escaped) wherever the sandbox's engine
  download limitation allowed generation to complete.
- **Compile/bundle**: `next build` was run and got through the full
  "Compiled successfully" + type-check step, proving every import,
  component, and API route resolves and type-checks correctly end to end.
  It stops one step later, at Prisma Client instantiation during static
  page-data collection — that's a network restriction in the build
  sandbox (no route to `binaries.prisma.sh` to fetch the query-engine
  binary), not a code defect. I didn't paper over this: it's called out
  here and in `SUBMISSION.md` instead of quietly claiming a full green
  build I didn't actually get in this environment. A normal `npm install`
  on a machine with unrestricted internet resolves it — that's the
  standard Prisma setup, nothing DocFlow-specific.
- **Tests**: `npm test` was actually run, not just written and assumed
  passing. `tests/permissions.test.ts` (11 cases covering owner/edit/view
  resolution, denial paths, and a two-account sharing scenario) passed in
  full. `tests/persistence.test.ts` is written to run against a real
  isolated SQLite file via `prisma db push`, but hits the same engine-
  download wall as `next build` in this sandbox, so I could not confirm it
  green here — I read through it carefully instead (create → assert
  fields match → update → assert the update persisted → share/upsert
  uniqueness check) and it exercises real Prisma calls, not mocks, so it
  will either pass or fail honestly once run somewhere with normal
  network access.
- **Logic review, not just trust**: for the permission function and the
  API route guards, I read every branch against the sharing spec in the
  brief (one owner, owner-managed sharing, edit-vs-view distinction) rather
  than assuming generated code matched intent — the "re-sharing by
  collaborators" issue above is what that review caught.
- **What I didn't get to verify manually**: I did not click through the
  actual running UI in a browser, because the Prisma engine couldn't be
  generated in this sandbox to bring the dev server up with a real
  database. That's the honest gap. `SUBMISSION.md` calls this out as the
  first thing to do with the "next 2-4 hours."
