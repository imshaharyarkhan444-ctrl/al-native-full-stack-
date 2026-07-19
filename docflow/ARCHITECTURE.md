# Architecture

## Data model

```
User
 ├─ id, name, email, color
 ├─ 1───* Document   (User.id = Document.ownerId)   "owns"
 └─ 1───* Share      (User.id = Share.userId)        "has been granted access to"

Document
 ├─ id, title, content (TipTap JSON, stored as a string), ownerId, timestamps
 └─ 1───* Share       (Document.id = Share.documentId)

Share  (join table: Document <-> User, with a permission)
 ├─ documentId, userId, permission ("edit" | "view")
 └─ @@unique([documentId, userId])   -- one share row per (doc, user) pair
```

In words: a `Document` has exactly one owner (`User`). A `Share` row is how
a document becomes visible to a *different* user, and it carries the
permission level for that specific person. Access for any (user, document)
pair is resolved by a single pure function, `getAccessLevel()` in
`lib/permissions.ts`: owner if `document.ownerId === userId`, otherwise the
matching `Share.permission` if one exists, otherwise no access. That
function is the one thing this whole app's security model rests on, which
is why it's isolated from React/Next and has the heaviest test coverage.

`content` is stored as a JSON string rather than a native `Json` column so
the schema stays byte-identical across SQLite (which has no native JSON
type) and Postgres (which does) — the swap from SQLite to Postgres in
`prisma/schema.prisma` is a one-line `provider` change, not a schema
rewrite or data migration.

## What was prioritized

1. **Correct, testable permissions** over UI polish. The sharing logic is a
   pure function with no framework dependencies specifically so it could be
   unit tested in isolation, and so every API route enforces access the
   same way instead of each route re-implementing its own checks.
2. **A working end-to-end loop** (create → type → autosave → refresh →
   content is still there) before anything else, since that's the actual
   core promise of a document editor. File upload and sharing were built
   on top of that loop, not in parallel with it.
3. **Structured content storage** (TipTap JSON, not HTML) per the brief,
   even though it's more work than just dumping `innerHTML`, because it
   keeps the door open for future structural features (version history,
   diffing, exporting) without a migration.
4. **Honest, visible error states** over silent failures — bad file types,
   empty titles, unauthorized access, and failed autosaves all surface a
   real message instead of a blank screen or console-only error.

## What was cut, and why

- **Real authentication.** The brief explicitly asked for mocked,
  session-based user switching instead — implementing real password auth
  would have been solving a problem that wasn't asked for, at the expense
  of time better spent on the actual editor/sharing/upload features.
- **Real-time / simultaneous co-editing** (CRDTs, WebSockets, presence
  cursors). This is the single biggest thing a true "Google Docs clone"
  would need and the single biggest thing explicitly out of scope for a
  4-6 hour "Google-Docs-*inspired*" build. Autosave-with-debounce covers
  the "collaborative" requirement in the achievable sense: multiple users
  can each edit a shared doc, just not in the same second without one
  overwriting the other's autosave.
- **.docx upload support.** Parsing `.docx` correctly (it's a zip of XML)
  is a meaningfully larger dependency/parsing surface than `.txt`/`.md`
  plain-text parsing, for a feature that wasn't the focus of the priority
  list. Flagged in the UI and README rather than silently unsupported.
- **Rich Markdown parsing** (inline `**bold**`, links, tables, images) on
  upload. The brief asked for `.md` files to become editable documents,
  which the current line-oriented parser (headings/lists/paragraphs)
  satisfies; full CommonMark parsing would pull in a real Markdown-to-
  ProseMirror library for a feature that's a conversion convenience, not a
  core requirement.
- **Version history / export**, per the brief's own instruction not to
  start the stretch goal unless the core is fully solid. Not started.

## Deployment tradeoff (SQLite vs. hosted DB)

SQLite is a file on disk. Vercel's serverless functions run on an
ephemeral, read-mostly filesystem — writes to a local SQLite file from one
invocation won't reliably be there for the next invocation (different
container, or the same container recycled). So: SQLite stays for local dev
(zero setup, fast, matches the brief's request), and the deployed instance
is configured to point at a hosted database (Neon/Supabase Postgres, or
Turso for a SQLite-compatible option) via `DATABASE_URL`. The schema was
deliberately kept portable (see "Data model" above) so this is a config
change, not an app rewrite. Full detail and manual steps are in
`README.md` → "Deployment (Vercel)".
