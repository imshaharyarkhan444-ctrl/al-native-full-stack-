import { describe, it, expect } from "vitest";
import {
  getAccessLevel,
  canView,
  canEdit,
  canManageSharing,
} from "@/lib/permissions";

const doc = { ownerId: "owner-1" };

describe("getAccessLevel", () => {
  it("grants owner access to the document owner", () => {
    expect(getAccessLevel("owner-1", doc, [])).toBe("owner");
  });

  it("grants edit access to a user with an edit share", () => {
    const shares = [{ userId: "user-2", permission: "edit" }];
    expect(getAccessLevel("user-2", doc, shares)).toBe("edit");
  });

  it("grants view access to a user with a view-only share", () => {
    const shares = [{ userId: "user-3", permission: "view" }];
    expect(getAccessLevel("user-3", doc, shares)).toBe("view");
  });

  it("denies access to a user with no share and who isn't the owner", () => {
    const shares = [{ userId: "user-2", permission: "edit" }];
    expect(getAccessLevel("user-99", doc, shares)).toBe("none");
  });

  it("denies access when userId is null/undefined (logged out)", () => {
    expect(getAccessLevel(null, doc, [])).toBe("none");
    expect(getAccessLevel(undefined, doc, [])).toBe("none");
  });

  it("treats unknown/garbage permission strings as edit (defensive default)", () => {
    const shares = [{ userId: "user-4", permission: "something-weird" }];
    expect(getAccessLevel("user-4", doc, shares)).toBe("edit");
  });
});

describe("canView / canEdit / canManageSharing", () => {
  it("owner can view, edit, and manage sharing", () => {
    expect(canView("owner")).toBe(true);
    expect(canEdit("owner")).toBe(true);
    expect(canManageSharing("owner")).toBe(true);
  });

  it("edit-shared user can view and edit but NOT manage sharing", () => {
    expect(canView("edit")).toBe(true);
    expect(canEdit("edit")).toBe(true);
    expect(canManageSharing("edit")).toBe(false);
  });

  it("view-shared user can view but NOT edit or manage sharing", () => {
    expect(canView("view")).toBe(true);
    expect(canEdit("view")).toBe(false);
    expect(canManageSharing("view")).toBe(false);
  });

  it("a user with no access can do nothing", () => {
    expect(canView("none")).toBe(false);
    expect(canEdit("none")).toBe(false);
    expect(canManageSharing("none")).toBe(false);
  });
});

describe("real-world scenario: two accounts sharing a document", () => {
  it("owner shares with a collaborator, collaborator edits, a third user is denied", () => {
    const document = { ownerId: "ava" };
    const shares = [{ userId: "marcus", permission: "edit" }];

    expect(getAccessLevel("ava", document, shares)).toBe("owner");
    expect(getAccessLevel("marcus", document, shares)).toBe("edit");
    expect(getAccessLevel("priya", document, shares)).toBe("none");

    expect(canEdit(getAccessLevel("marcus", document, shares))).toBe(true);
    expect(canView(getAccessLevel("priya", document, shares))).toBe(false);
  });
});
