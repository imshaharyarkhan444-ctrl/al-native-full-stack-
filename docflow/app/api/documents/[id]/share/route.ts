import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canManageSharing, getAccessLevel } from "@/lib/permissions";

// POST /api/documents/:id/share -> { userId, permission } add/update a share
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    include: { shares: true },
  });
  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const access = getAccessLevel(user.id, doc, doc.shares);
  if (!canManageSharing(access)) {
    return NextResponse.json(
      { error: "Only the document owner can manage sharing." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const targetUserId = body.userId as string | undefined;
  const permission = body.permission === "view" ? "view" : "edit";

  if (!targetUserId) {
    return NextResponse.json(
      { error: "Select a user to share with." },
      { status: 400 }
    );
  }
  if (targetUserId === doc.ownerId) {
    return NextResponse.json(
      { error: "The owner already has full access to this document." },
      { status: 400 }
    );
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    return NextResponse.json({ error: "That user doesn't exist." }, { status: 404 });
  }

  const share = await prisma.share.upsert({
    where: { documentId_userId: { documentId: doc.id, userId: targetUserId } },
    update: { permission },
    create: { documentId: doc.id, userId: targetUserId, permission },
  });

  return NextResponse.json({ share });
}

// DELETE /api/documents/:id/share -> { userId } revoke a share
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    include: { shares: true },
  });
  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const access = getAccessLevel(user.id, doc, doc.shares);
  if (!canManageSharing(access)) {
    return NextResponse.json(
      { error: "Only the document owner can manage sharing." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const targetUserId = body.userId as string | undefined;
  if (!targetUserId) {
    return NextResponse.json(
      { error: "Missing userId to revoke." },
      { status: 400 }
    );
  }

  await prisma.share
    .delete({
      where: { documentId_userId: { documentId: doc.id, userId: targetUserId } },
    })
    .catch(() => null); // idempotent — fine if it was already removed

  return NextResponse.json({ ok: true });
}
