import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
type ShareWithDoc = {
  permission: string;
  document: {
    id: string;
    title: string;
    content: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
    owner: { name: string };
  };
};

const EMPTY_DOC = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph" }],
});

// GET /api/documents -> { owned: Document[], shared: Document[] }
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const [owned, sharedRows] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.share.findMany({
      where: { userId: user.id },
      include: { document: { include: { owner: true } } },
      orderBy: { document: { updatedAt: "desc" } },
    }),
  ]);

  const shared = (sharedRows as ShareWithDoc[]).map((s) => ({
    ...s.document,
    ownerName: s.document.owner.name,
    myPermission: s.permission,
  }));

  return NextResponse.json({ owned, shared });
}

// POST /api/documents -> create a new blank document
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";

  if (!title) {
    return NextResponse.json(
      { error: "Document title cannot be empty." },
      { status: 400 }
    );
  }
  if (title.length > 200) {
    return NextResponse.json(
      { error: "Document title is too long (max 200 characters)." },
      { status: 400 }
    );
  }

  const content =
    typeof body.content === "string" && body.content.length > 0
      ? body.content
      : EMPTY_DOC;

  const doc = await prisma.document.create({
    data: { title, content, ownerId: user.id },
  });

  return NextResponse.json({ document: doc }, { status: 201 });
}
