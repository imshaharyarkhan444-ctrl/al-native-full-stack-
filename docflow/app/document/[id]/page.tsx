"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Editor from "@/components/Editor";
import ShareModal from "@/components/ShareModal";

type User = { id: string; name: string; email: string; color: string };
type ShareRow = { userId: string; permission: string };
type DocData = {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  owner: { name: string };
};

export default function DocumentPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [doc, setDoc] = useState<DocData | null>(null);
  const [access, setAccess] = useState<string>("none");
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [title, setTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const meRes = await fetch("/api/auth/me");
      const me = await meRes.json();
      if (!me.user) {
        router.push("/login");
        return;
      }
      setCurrentUser(me.user);
      setAllUsers(me.allUsers ?? []);

      const res = await fetch(`/api/documents/${params.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load document.");

      setDoc(data.document);
      setAccess(data.access);
      setShares(data.shares.map((s: ShareRow) => ({ userId: s.userId, permission: s.permission })));
      setTitle(data.document.title);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function saveTitle() {
    if (!doc) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title can't be empty.");
      setTitle(doc.title);
      return;
    }
    if (trimmed === doc.title) return;
    setSavingTitle(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't rename document.");
      setDoc({ ...doc, title: trimmed });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setTitle(doc.title);
    } finally {
      setSavingTitle(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10 text-gray-400 text-sm">
        Loading document…
      </main>
    );
  }

  if (error && !doc) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-4">
          {error}
        </div>
        <Link href="/dashboard" className="text-indigo-600 text-sm">
          &larr; Back to dashboard
        </Link>
      </main>
    );
  }

  if (!doc) return null;

  const readOnly = access === "view";
  const isOwner = access === "owner";

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-700">
          &larr; Back
        </Link>
        {isOwner && (
          <button
            onClick={() => setShowShare(true)}
            className="text-sm rounded-lg border border-gray-300 px-3 py-1.5 hover:border-gray-400"
          >
            Share
          </button>
        )}
      </div>

      {(error || saveError) && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error || saveError}
        </div>
      )}

      <input
        value={title}
        disabled={readOnly}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={saveTitle}
        className="text-3xl font-bold tracking-tight mb-1 w-full outline-none bg-transparent disabled:text-gray-500"
      />
      <p className="text-xs text-gray-400 mb-4">
        {isOwner ? "You own this document" : `Owned by ${doc.owner.name}`}
        {savingTitle && " · saving title…"}
      </p>

      <Editor
        documentId={doc.id}
        initialContent={doc.content}
        readOnly={readOnly}
        onSaveError={setSaveError}
      />

      {showShare && currentUser && (
        <ShareModal
          documentId={doc.id}
          allUsers={allUsers}
          ownerId={doc.ownerId}
          currentShares={shares}
          onClose={() => setShowShare(false)}
          onChanged={setShares}
        />
      )}
    </main>
  );
}
