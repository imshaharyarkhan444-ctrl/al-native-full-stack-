import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAccessLevel, canEdit, canView } from "@/lib/permissions";

async function loadDocWithShares(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: { shares: true, owner: true },
  });
}

// GET /api/documents/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const doc = await loadDocWithShares(params.id);
  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const access = getAccessLevel(user.id, doc, doc.shares);
  if (!canView(access)) {
    return NextResponse.json(
      { error: "You don't have access to this document." },
      { status: 403 }
    );
  }

  return NextResponse.json({
    document: doc,
    access,
    shares: doc.shares,
  });
}

// PATCH /api/documents/:id  -> update title and/or content (autosave)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const doc = await loadDocWithShares(params.id);
  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const access = getAccessLevel(user.id, doc, doc.shares);
  if (!canEdit(access)) {
    return NextResponse.json(
      { error: "You don't have permission to edit this document." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const data: { title?: string; content?: string } = {};

  if (body.title !== undefined) {
    const title = String(body.title).trim();
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
    data.title = title;
  }

  if (body.content !== undefined) {
    if (typeof body.content !== "string") {
      return NextResponse.json(
        { error: "Document content must be a JSON string." },
        { status: 400 }
      );
    }
    try {
      JSON.parse(body.content);
    } catch {
      return NextResponse.json(
        { error: "Document content is not valid JSON." },
        { status: 400 }
      );
    }
    data.content = body.content;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Nothing to update." },
      { status: 400 }
    );
  }

  const updated = await prisma.document.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({ document: updated });
}

// DELETE /api/documents/:id -> owner only
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const doc = await loadDocWithShares(params.id);
  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  if (doc.ownerId !== user.id) {
    return NextResponse.json(
      { error: "Only the owner can delete this document." },
      { status: 403 }
    );
  }

  await prisma.document.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
