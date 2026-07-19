import { cookies } from "next/headers";
import { prisma } from "./prisma";

// --- Mocked auth ---------------------------------------------------------
// This is intentionally NOT real authentication. There is no password check,
// no hashing, no JWT. It's a session cookie holding a seeded user's id, so
// reviewers can switch between the 4 demo accounts and see sharing behave
// correctly across them. See README "Auth" section and ARCHITECTURE.md for
// why this was scoped this way.
// ---------------------------------------------------------------------------

export const SESSION_COOKIE = "docflow_session";

export async function getCurrentUser() {
  const cookieStore = cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Not authenticated. Please log in.");
  }
  return user;
}

export class AuthError extends Error {
  status = 401;
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
