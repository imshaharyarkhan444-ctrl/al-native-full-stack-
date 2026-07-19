// Pure, framework-free permission logic so it's easy to unit test
// without spinning up Next.js request handling or a real DB.

export type DocLike = { ownerId: string };
export type ShareLike = { userId: string; permission: string };

export type AccessLevel = "owner" | "edit" | "view" | "none";

/**
 * Determines what access a given user has to a document, based on
 * ownership and any Share records for that document.
 */
export function getAccessLevel(
  userId: string | null | undefined,
  document: DocLike,
  shares: ShareLike[]
): AccessLevel {
  if (!userId) return "none";
  if (document.ownerId === userId) return "owner";

  const share = shares.find((s) => s.userId === userId);
  if (!share) return "none";

  return share.permission === "view" ? "view" : "edit";
}

export function canView(level: AccessLevel): boolean {
  return level === "owner" || level === "edit" || level === "view";
}

export function canEdit(level: AccessLevel): boolean {
  return level === "owner" || level === "edit";
}

export function canManageSharing(level: AccessLevel): boolean {
  // Only the owner can add/remove collaborators, regardless of edit access.
  return level === "owner";
}
