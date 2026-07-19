"use client";

import { useState } from "react";

type User = { id: string; name: string; email: string; color: string };
type ShareRow = { userId: string; permission: string };

export default function ShareModal({
  documentId,
  allUsers,
  ownerId,
  currentShares,
  onClose,
  onChanged,
}: {
  documentId: string;
  allUsers: User[];
  ownerId: string;
  currentShares: ShareRow[];
  onClose: () => void;
  onChanged: (shares: ShareRow[]) => void;
}) {
  const [shares, setShares] = useState<ShareRow[]>(currentShares);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [permission, setPermission] = useState<"edit" | "view">("edit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const shareable = allUsers.filter(
    (u) => u.id !== ownerId && !shares.some((s) => s.userId === u.id)
  );

  async function addShare() {
    if (!selectedUserId) {
      setError("Pick someone to share with.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, permission }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't share document.");
      const next = [
        ...shares.filter((s) => s.userId !== selectedUserId),
        { userId: selectedUserId, permission },
      ];
      setShares(next);
      onChanged(next);
      setSelectedUserId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function removeShare(userId: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/share`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't remove access.");
      const next = shares.filter((s) => s.userId !== userId);
      setShares(next);
      onChanged(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function nameFor(id: string) {
    return allUsers.find((u) => u.id === id)?.name ?? "Unknown user";
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Share document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">
            Close
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
          {shares.length === 0 && (
            <p className="text-xs text-gray-400">Not shared with anyone yet.</p>
          )}
          {shares.map((s) => (
            <div
              key={s.userId}
              className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
            >
              <div>
                <div className="text-sm">{nameFor(s.userId)}</div>
                <div className="text-[10px] uppercase text-gray-400">
                  {s.permission === "view" ? "View only" : "Can edit"}
                </div>
              </div>
              <button
                disabled={busy}
                onClick={() => removeShare(s.userId)}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 text-sm px-2 py-2"
          >
            <option value="">Select a person…</option>
            {shareable.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select
            value={permission}
            onChange={(e) => setPermission(e.target.value as "edit" | "view")}
            className="rounded-lg border border-gray-300 text-sm px-2 py-2"
          >
            <option value="edit">Can edit</option>
            <option value="view">View only</option>
          </select>
          <button
            onClick={addShare}
            disabled={busy || shareable.length === 0}
            className="rounded-lg bg-indigo-600 text-white text-sm px-3 py-2 hover:bg-indigo-700 disabled:opacity-50"
          >
            Share
          </button>
        </div>
        {shareable.length === 0 && (
          <p className="text-xs text-gray-400 mt-2">
            Everyone already has access to this document.
          </p>
        )}
      </div>
    </div>
  );
}
