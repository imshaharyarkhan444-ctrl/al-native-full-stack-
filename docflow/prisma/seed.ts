import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USERS = [
  { name: "Ava Chen", email: "ava@docflow.dev", color: "#6366f1" },
  { name: "Marcus Reed", email: "marcus@docflow.dev", color: "#059669" },
  { name: "Priya Nair", email: "priya@docflow.dev", color: "#dc2626" },
  { name: "Sam Okafor", email: "sam@docflow.dev", color: "#d97706" },
];

function doc(text: string) {
  return JSON.stringify({
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text }] },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This is a seeded demo document. Edit me, share me, or upload a .txt/.md file to create a new one.",
          },
        ],
      },
    ],
  });
}

async function main() {
  console.log("Seeding database...");

  await prisma.share.deleteMany();
  await prisma.document.deleteMany();
  await prisma.user.deleteMany();

  const created = [];
  for (const u of USERS) {
    created.push(await prisma.user.create({ data: u }));
  }
  const [ava, marcus, priya, sam] = created;

  const d1 = await prisma.document.create({
    data: {
      title: "Q3 Planning Notes",
      content: doc("Q3 Planning Notes"),
      ownerId: ava.id,
    },
  });

  const d2 = await prisma.document.create({
    data: {
      title: "Marcus's Design Journal",
      content: doc("Marcus's Design Journal"),
      ownerId: marcus.id,
    },
  });

  await prisma.document.create({
    data: {
      title: "Priya's Private Draft",
      content: doc("Priya's Private Draft"),
      ownerId: priya.id,
    },
  });

  // Ava shares her doc with Marcus (edit) and Sam (view)
  await prisma.share.create({
    data: { documentId: d1.id, userId: marcus.id, permission: "edit" },
  });
  await prisma.share.create({
    data: { documentId: d1.id, userId: sam.id, permission: "edit" },
  });

  // Marcus shares his doc with Ava
  await prisma.share.create({
    data: { documentId: d2.id, userId: ava.id, permission: "edit" },
  });

  console.log("Seeded 4 users, 3 documents, 3 shares.");
  console.log("Demo users:", USERS.map((u) => u.email).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
