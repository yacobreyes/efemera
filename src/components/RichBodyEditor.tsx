"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { JSONContent } from "@tiptap/react";

const CRIMSON = "#8B0000";
const BORDER = "#e1e8ed";
const TEXT_DARK = "#1c2938";
const FONT = "'Inter', sans-serif";

interface Props {
  initialContent: JSONContent;
  onChange: (doc: JSONContent) => void;
  editorRef?: React.MutableRefObject<{ focus: () => void } | null>;
}

export default function RichBodyEditor({ initialContent, onChange, editorRef }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    onUpdate({ editor }) {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        style: [
          "min-height:320px",
          "padding:0.5rem 0.7rem",
          "font-family:" + FONT,
          "font-size:0.95rem",
          "line-height:1.75",
          "color:" + TEXT_DARK,
          "outline:none",
          "border:none",
          "background:white",
        ].join(";"),
      },
    },
  });

  useEffect(() => {
    if (editorRef) editorRef.current = editor ? { focus: () => editor.commands.focus() } : null;
  }, [editor, editorRef]);

  // Sync when initialContent changes externally (e.g. loading a different post)
  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(initialContent);
    if (current !== next) editor.commands.setContent(initialContent);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]);

  if (!editor) return null;

  const btn = (label: string, title: string, active: boolean, action: () => void, style?: React.CSSProperties) => (
    <button
      key={label}
      type="button"
      title={title}
      onMouseDown={e => e.preventDefault()}
      onClick={action}
      style={{
        background: active ? "#f0f0f0" : "white",
        border: `1px solid ${active ? "#ccc" : BORDER}`,
        borderRadius: 3,
        padding: "0.2rem 0.55rem",
        fontFamily: FONT,
        fontSize: "0.85rem",
        cursor: "pointer",
        color: active ? CRIMSON : TEXT_DARK,
        lineHeight: 1.4,
        ...style,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: "0.35rem", padding: "0.4rem 0.5rem", borderBottom: `1px solid ${BORDER}`, background: "#fafbfc", flexWrap: "wrap", alignItems: "center" }}>
        {btn("B", "Bold (Cmd+B)", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), { fontWeight: 700 })}
        {btn("I", "Italic (Cmd+I)", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), { fontStyle: "italic" })}
        <div style={{ width: 1, height: 18, background: BORDER, margin: "0 0.1rem" }} />
        {btn("H2", "Heading 2", editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        {btn("H3", "Heading 3", editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
        {btn(""  + String.fromCharCode(8220) + "Q" + String.fromCharCode(8221), "Blockquote", editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run())}
        <div style={{ width: 1, height: 18, background: BORDER, margin: "0 0.1rem" }} />
        {btn("↩", "Undo (Cmd+Z)", false, () => editor.chain().focus().undo().run(), { color: editor.can().undo() ? TEXT_DARK : "#aaa" })}
        {btn("↪", "Redo", false, () => editor.chain().focus().redo().run(), { color: editor.can().redo() ? TEXT_DARK : "#aaa" })}
      </div>

      {/* Editor area */}
      <style>{`
        .ProseMirror p { margin: 0 0 0.8em; }
        .ProseMirror p:last-child { margin-bottom: 0; }
        .ProseMirror h2 { font-family: ${FONT}; font-size: 1.2rem; font-weight: 700; color: #1c2938; margin: 1.2em 0 0.4em; }
        .ProseMirror h3 { font-family: ${FONT}; font-size: 1rem; font-weight: 700; color: #1c2938; margin: 1em 0 0.3em; }
        .ProseMirror blockquote { border-left: 3px solid ${CRIMSON}; margin: 0.8em 0; padding: 0.1em 0 0.1em 1em; font-style: italic; color: #526270; }
        .ProseMirror:focus { outline: none; }
      `}</style>
      <EditorContent editor={editor} />
      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "0.3rem 0.7rem", background: "#fafbfc", fontFamily: FONT, fontSize: "0.72rem", color: "#aaa", textAlign: "right" }}>
        {editor.getText().trim() ? editor.getText().trim().split(/\s+/).length : 0} words
      </div>
    </div>
  );
}
