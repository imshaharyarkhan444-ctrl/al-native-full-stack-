import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

// This test exercises a REAL SQLite database (isolated from dev.db) to prove
// that documents, users, and shares round-trip correctly through Prisma:
// create -> persist -> read back -> update -> read back again.
// It pushes the schema to a throwaway file before running and deletes it after.

const TEST_DB_PATH = path.join(__dirname, "test.db");
const TEST_DB_URL = `file:${TEST_DB_PATH}`;

let prisma: PrismaClient;

beforeAll(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.rmSync(TEST_DB_PATH);

  execSync("npx prisma db push --skip-generate", {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "pipe",
  });

  prisma = new PrismaClient({
    datasources: { db: { url: TEST_DB_URL } },
  });
}, 30000);

afterAll(async () => {
  await prisma?.$disconnect();
  if (fs.existsSync(TEST_DB_PATH)) fs.rmSync(TEST_DB_PATH);
  for (const suffix of ["-journal", "-wal", "-shm"]) {
    const p = TEST_DB_PATH + suffix;
    if (fs.existsSync(p)) fs.rmSync(p);
  }
});

describe("document persistence round-trip", () => {
  it("creates a user and document, persists TipTap JSON content, and reads it back unchanged", async () => {
    const user = await prisma.user.create({
      data: { name: "Test User", email: "test-user@docflow.dev", color: "#000000" },
    });

    const tiptapJson = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Hello" }] },
        { type: "paragraph", content: [{ type: "text", text: "World" }] },
      ],
    };

    const created = await prisma.document.create({
      data: {
        title: "Round Trip Doc",
        content: JSON.stringify(tiptapJson),
        ownerId: user.id,
      },
    });

    const fetched = await prisma.document.findUnique({ where: { id: created.id } });

    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe("Round Trip Doc");
    expect(JSON.parse(fetched!.content)).toEqual(tiptapJson);
  });

  it("persists an edit (simulating autosave) and reflects it on reload", async () => {
    const user = await prisma.user.create({
      data: { name: "Editor User", email: "editor-user@docflow.dev", color: "#111111" },
    });

    const doc = await prisma.document.create({
      data: {
        title: "Draft",
        content: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
        ownerId: user.id,
      },
    });

    const updatedContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Autosaved text" }] }],
    };

    await prisma.document.update({
      where: { id: doc.id },
      data: { content: JSON.stringify(updatedContent) },
    });

    const reloaded = await prisma.document.findUnique({ where: { id: doc.id } });
    expect(JSON.parse(reloaded!.content)).toEqual(updatedContent);
    expect(reloaded!.updatedAt.getTime()).toBeGreaterThanOrEqual(doc.createdAt.getTime());
  });

  it("persists a share relationship and makes it queryable from both directions", async () => {
    const owner = await prisma.user.create({
      data: { name: "Owner User", email: "owner-user@docflow.dev", color: "#222222" },
    });
    const collaborator = await prisma.user.create({
      data: { name: "Collaborator User", email: "collab-user@docflow.dev", color: "#333333" },
    });

    const doc = await prisma.document.create({
      data: { title: "Shared Doc", ownerId: owner.id },
    });

    await prisma.share.create({
      data: { documentId: doc.id, userId: collaborator.id, permission: "edit" },
    });

    const sharesForDoc = await prisma.share.findMany({ where: { documentId: doc.id } });
    expect(sharesForDoc).toHaveLength(1);
    expect(sharesForDoc[0].userId).toBe(collaborator.id);

    const sharedWithCollaborator = await prisma.share.findMany({
      where: { userId: collaborator.id },
      include: { document: true },
    });
    expect(sharedWithCollaborator).toHaveLength(1);
    expect(sharedWithCollaborator[0].document.title).toBe("Shared Doc");

    // Uniqueness constraint: sharing the same doc with the same user twice
    // should upsert, not duplicate.
    await prisma.share.upsert({
      where: { documentId_userId: { documentId: doc.id, userId: collaborator.id } },
      update: { permission: "view" },
      create: { documentId: doc.id, userId: collaborator.id, permission: "view" },
    });
    const sharesAfterUpsert = await prisma.share.findMany({ where: { documentId: doc.id } });
    expect(sharesAfterUpsert).toHaveLength(1);
    expect(sharesAfterUpsert[0].permission).toBe("view");
  });
});
