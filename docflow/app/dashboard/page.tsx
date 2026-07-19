"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DocumentCard from "@/components/DocumentCard";

type User = { id: string; name: string; email: string; color: string };
type Doc = {
  id: string;
  title: string;
  updatedAt: string;
  ownerId: string;
  ownerName?: string;
  myPermission?: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [owned, setOwned] = useState<Doc[]>([]);
  const [shared, setShared] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showNewDocForm, setShowNewDocForm] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const meRes = await fetch("/api/auth/me");
      const me = await meRes.json();
      if (!me.user) {
        router.push("/login");
        return;
      }
      setUser(me.user);

      const docsRes = await fetch("/api/documents");
      if (!docsRes.ok) throw new Error("Couldn't load documents.");
      const docs = await docsRes.json();
      setOwned(docs.owned ?? []);
      setShared(docs.shared ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) {
      setError("Give your document a title first.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't create document.");
      router.push(`/document/${data.document.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setCreating(false);
    }
  }

  async function handleUploadChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      router.push(`/document/${data.document.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setUploading(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document? This can't be undone.")) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't delete document.");
      setOwned((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DocFlow</h1>
          <p className="text-sm text-gray-500">Your documents, in one place.</p>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: user.color }}
              title={user.email}
            >
              {user.name.split(" ").map((p) => p[0]).join("")}
            </span>
            <span className="text-sm text-gray-600 hidden sm:inline">{user.name}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5"
            >
              Switch user
            </button>
          </div>
        )}
      </header>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}

      <section className="mb-10 flex flex-wrap gap-3">
        {!showNewDocForm ? (
          <button
            onClick={() => setShowNewDocForm(true)}
            className="rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-indigo-700 transition"
          >
            + New document
          </button>
        ) : (
          <form onSubmit={handleCreate} className="flex gap-2 items-center">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Document title"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm w-64"
            />
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewDocForm(false);
                setNewTitle("");
              }}
              className="text-sm text-gray-500 px-2"
            >
              Cancel
            </button>
          </form>
        )}

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md"
            className="hidden"
            onChange={handleUploadChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg border border-gray-300 bg-white text-sm font-medium px-4 py-2.5 hover:border-gray-400 transition disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload .txt / .md"}
          </button>
          <p className="text-xs text-gray-400 mt-1">Supports .txt and .md files.</p>
        </div>
      </section>

      {loading ? (
        <div className="text-gray-400 text-sm">Loading your documents…</div>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              My Documents
            </h2>
            {owned.length === 0 ? (
              <p className="text-sm text-gray-400">
                No documents yet. Create one above to get started.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {owned.map((d) => (
                  <DocumentCard
                    key={d.id}
                    doc={d}
                    isOwner
                    onDelete={() => handleDelete(d.id)}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Shared With Me
            </h2>
            {shared.length === 0 ? (
              <p className="text-sm text-gray-400">
                Nothing has been shared with you yet.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {shared.map((d) => (
                  <DocumentCard key={d.id} doc={d} isOwner={false} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
