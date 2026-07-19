"use client";

import type { Editor } from "@tiptap/react";

function Btn({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`h-8 min-w-8 px-2 rounded-md text-sm font-medium flex items-center justify-center transition
        ${active ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-gray-100"}
        disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

export default function Toolbar({
  editor,
  readOnly,
}: {
  editor: Editor | null;
  readOnly: boolean;
}) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-white px-3 py-2 sticky top-0 z-10">
      <Btn
        label="Bold"
        active={editor.isActive("bold")}
        disabled={readOnly}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <span className="font-bold">B</span>
      </Btn>
      <Btn
        label="Italic"
        active={editor.isActive("italic")}
        disabled={readOnly}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span className="italic">I</span>
      </Btn>
      <Btn
        label="Underline"
        active={editor.isActive("underline")}
        disabled={readOnly}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span className="underline">U</span>
      </Btn>

      <div className="w-px h-5 bg-gray-200 mx-1" />

      <Btn
        label="Heading 1"
        active={editor.isActive("heading", { level: 1 })}
        disabled={readOnly}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </Btn>
      <Btn
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        disabled={readOnly}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </Btn>
      <Btn
        label="Paragraph"
        active={editor.isActive("paragraph")}
        disabled={readOnly}
        onClick={() => editor.chain().focus().setParagraph().run()}
      >
        P
      </Btn>

      <div className="w-px h-5 bg-gray-200 mx-1" />

      <Btn
        label="Bulleted list"
        active={editor.isActive("bulletList")}
        disabled={readOnly}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •—
      </Btn>
      <Btn
        label="Numbered list"
        active={editor.isActive("orderedList")}
        disabled={readOnly}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.—
      </Btn>

      {readOnly && (
        <span className="ml-auto text-xs text-gray-400 italic pr-2">
          View only — you can't edit this document
        </span>
      )}
    </div>
  );
}
