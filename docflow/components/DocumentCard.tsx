"use client";

import Link from "next/link";

type Doc = {
  id: string;
  title: string;
  updatedAt: string;
  ownerName?: string;
  myPermission?: string;
};

export default function DocumentCard({
  doc,
  isOwner,
  onDelete,
}: {
  doc: Doc;
  isOwner: boolean;
  onDelete?: () => void;
}) {
  const updated = new Date(doc.updatedAt);

  return (
    <div className="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition">
      <Link href={`/document/${doc.id}`} className="block">
        <div className="h-20 rounded-lg bg-gradient-to-br from-indigo-50 to-white border border-gray-100 mb-3 flex items-center justify-center text-indigo-300 text-2xl font-serif">
          Aa
        </div>
        <h3 className="font-medium text-sm truncate">{doc.title}</h3>
        <p className="text-xs text-gray-400 mt-1">
          Updated {updated.toLocaleDateString()} {updated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
        {!isOwner && (
          <div className="flex items-center gap-2 mt-2">
            {doc.ownerName && (
              <span className="text-xs text-gray-500">by {doc.ownerName}</span>
            )}
            <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
              {doc.myPermission === "view" ? "View only" : "Can edit"}
            </span>
          </div>
        )}
      </Link>
      {isOwner && onDelete && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onDelete();
          }}
          className="absolute top-3 right-3 text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
          title="Delete document"
        >
          Delete
        </button>
      )}
    </div>
  );
}
