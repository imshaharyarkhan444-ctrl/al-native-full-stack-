import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  const allUsers = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ user, allUsers });
}
