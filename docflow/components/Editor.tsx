"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useEffect, useRef, useState } from "react";
import Toolbar from "./Toolbar";

type SaveStatus = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 800;

export default function Editor({
  documentId,
  initialContent,
  readOnly,
  onSaveError,
}: {
  documentId: string;
  initialContent: string;
  readOnly: boolean;
  onSaveError?: (message: string) => void;
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstUpdate = useRef(true);

  let parsedContent: unknown;
  try {
    parsedContent = JSON.parse(initialContent);
  } catch {
    parsedContent = { type: "doc", content: [{ type: "paragraph" }] };
  }

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: parsedContent as never,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: "prose max-w-none px-6 py-6 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      if (isFirstUpdate.current) {
        isFirstUpdate.current = false;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setStatus("saving");
      debounceRef.current = setTimeout(async () => {
        try {
          const json = editor.getJSON();
          const res = await fetch(`/api/documents/${documentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: JSON.stringify(json) }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Couldn't save your changes.");
          }
          setStatus("saved");
        } catch (e) {
          setStatus("error");
          onSaveError?.(
            e instanceof Error ? e.message : "Couldn't save your changes."
          );
        }
      }, AUTOSAVE_DELAY_MS);
    },
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <Toolbar editor={editor} readOnly={readOnly} />
      <EditorContent editor={editor} />
      <div className="px-6 py-2 border-t border-gray-100 text-xs text-gray-400">
        {status === "saving" && "Saving…"}
        {status === "saved" && "All changes saved"}
        {status === "error" && (
          <span className="text-red-500">Couldn't save — check your connection</span>
        )}
        {status === "idle" && readOnly && "View only"}
        {status === "idle" && !readOnly && "Ready"}
      </div>
    </div>
  );
}
