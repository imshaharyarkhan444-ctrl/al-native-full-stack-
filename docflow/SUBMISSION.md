# Submission Checklist

## Included in this repo

- `/app` — Next.js App Router pages and API routes
- `/components` — Editor, Toolbar, DocumentCard, ShareModal
- `/lib` — Prisma client singleton, mocked auth, permission logic, file parser
- `/prisma` — schema.prisma, seed.ts
- `/tests` — permissions.test.ts, persistence.test.ts
- `README.md`, `ARCHITECTURE.md`, `AI_WORKFLOW.md`, `SUBMISSION.md` (this file)
- `.env.example`, `vercel.json`

## Working (built and verified per the level of verification available — see below)

- [x] Document create, rename, debounced autosave, reopen with content intact
- [x] TipTap toolbar: Bold, Italic, Underline, H1/H2/Paragraph, bullet list, numbered list
- [x] Content stored as TipTap JSON, not HTML
- [x] `.txt` and `.md` upload → converted into a new editable document
- [x] Clear in-UI and README statement of supported/unsupported upload formats
- [x] Owner-based sharing: pick a seeded user, choose edit or view-only
- [x] Dashboard split into "My Documents" / "Shared With Me"
- [x] Edit vs. view-only access explicitly enforced server-side, not just hidden in the UI
- [x] Documents/users/shares persist via Prisma; sharing is queryable from both directions
- [x] Input validation: empty titles rejected, unsupported file types rejected, oversized files rejected
- [x] Unauthorized access attempts return 401/403 with a real message, not a stack trace
- [x] Automated tests: 11 passing unit tests on permission logic + a written (not sandbox-verified, see below) persistence round-trip test
- [x] Clean folder structure matching the brief (`/app`, `/components`, `/lib`, `/prisma`, `/tests`)
- [x] `vercel.json` + documented deployment path to a hosted DB

## Verified vs. not verified — read this before assuming a full green build

This was built in a network-sandboxed environment where `binaries.prisma.sh`
(Prisma's query-engine binary host) was unreachable, so `prisma generate`
could not complete. Concretely:

- **Verified**: `npx tsc --noEmit` clean. `next build` completes the full
  compile + type-check stage ("Compiled successfully"). The 11
  `permissions.test.ts` tests actually ran and passed.
- **Not verified in this environment** (but should work normally with a
  standard `npm install` on a machine with normal internet access): the
  dev server actually serving pages end-to-end in a browser, the full
  `next build` completing past the Prisma-Client-instantiation step, and
  `tests/persistence.test.ts` actually running green (it's written against
  a real Prisma/SQLite round trip, not mocked, so it's an honest test —
  I just couldn't execute it here).

I'm flagging this explicitly instead of presenting an unqualified "it all
works" — see `AI_WORKFLOW.md` for the full verification breakdown.

## Incomplete / not attempted

- Stretch goal (version history or export) — not started, per the brief's
  instruction to only attempt it once the core is 100% solid, and given
  the verification gap above, I judged that time was better spent being
  honest about what's confirmed working than adding an unverified stretch
  feature on top.
- Real-time simultaneous co-editing (last-write-wins on autosave instead) —
  explicit scope cut, documented in `ARCHITECTURE.md`.
- `.docx` upload — explicit scope cut, documented in `README.md`.
- Manual click-through QA in an actual browser — blocked by the sandbox's
  Prisma engine limitation described above.

## What I'd build next with 2-4 more hours

1. **First priority: run this for real.** Install on a machine with normal
   internet access, run migrate + seed, click through every flow (create,
   edit, autosave, refresh, upload both file types, share with both
   permission levels, log in as the recipient and confirm view-only
   actually blocks edits in the UI, not just the API) and fix whatever that
   surfaces. Everything above is "should work by code review," not yet
   "watched it work."
2. Version history: append-only `Revision` table (documentId, content,
   createdAt, authorId), snapshot on each autosave or on a longer debounce,
   simple "restore this version" action. The schema already isolates
   `content` cleanly enough that this is additive, not a migration of
   existing data.
3. Export to Markdown: walk the TipTap JSON tree and reverse the mapping
   `lib/fileParser.ts` already does one direction, for headings/lists/
   paragraphs/bold/italic.
4. Real-time presence (even just "Marcus is viewing this doc right now",
   short of full co-editing) via polling or a simple WebSocket, since the
   brief's "collaborative" framing implies knowing who else is around even
   if simultaneous editing is out of scope.
5. Tighten file upload validation with content-sniffing (not just extension
   checking) and add a few more edge-case tests (e.g., sharing with a
   nonexistent user, deleting a document that has active shares).
