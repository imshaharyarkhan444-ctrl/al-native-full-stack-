"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = { id: string; name: string; email: string; color: string };

export default function LoginPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.allUsers ?? []);
        if (data.user) {
          router.push("/dashboard");
        }
      })
      .catch(() => setError("Couldn't load demo users. Is the database seeded?"))
      .finally(() => setLoading(false));
  }, [router]);

  async function login(userId: string) {
    setPendingId(userId);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Login failed.");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
      setPendingId(null);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">DocFlow</h1>
          <p className="text-gray-500 mt-2">
            Pick a demo account to sign in. No password needed — this is a
            mocked auth flow for reviewers to test sharing across accounts.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading demo users…</div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => login(u.id)}
                disabled={pendingId !== null}
                className="w-full flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm hover:border-indigo-300 hover:shadow transition disabled:opacity-50"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: u.color }}
                >
                  {u.name.split(" ").map((p) => p[0]).join("")}
                </span>
                <span>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </span>
                {pendingId === u.id && (
                  <span className="ml-auto text-xs text-gray-400">Signing in…</span>
                )}
              </button>
            ))}
            {users.length === 0 && (
              <div className="text-center text-sm text-gray-500 py-6">
                No users found. Run <code className="bg-gray-100 px-1 rounded">npm run db:seed</code> first.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
