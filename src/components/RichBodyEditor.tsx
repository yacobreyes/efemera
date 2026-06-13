"use client";

import { useEffect } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import type { JSONContent } from "@tiptap/react";

const CRIMSON = "#8B0000";
const TEXT_DARK = "#1c2938";
const FONT = "'Inter', sans-serif";

interface Props {
  initialContent: JSONContent;
  onChange: (doc: JSONContent) => void;
  onEditor?: (editor: Editor | null) => void;
}

export default function RichBodyEditor({ initialContent, onChange, onEditor }: Props) {
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: "Type your story" })],
    content: initialContent,
    onUpdate({ editor }) {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        style: [
          "min-height:320px",
          "padding:0",
          "font-family:" + FONT,
          "font-size:1rem",
          "line-height:1.8",
          "color:" + TEXT_DARK,
          "outline:none",
          "border:none",
          "background:transparent",
        ].join(";"),
      },
    },
  });

  useEffect(() => {
    onEditor?.(editor ?? null);
    return () => onEditor?.(null);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(initialContent);
    if (current !== next) editor.commands.setContent(initialContent);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]);

  if (!editor) return null;

  return (
    <>
      <style>{`
        .ProseMirror p.is-empty:first-child::before { content: attr(data-placeholder); color: #aaa; pointer-events: none; float: left; height: 0; }
        .ProseMirror p { margin: 0 0 1em; }
        .ProseMirror p:last-child { margin-bottom: 0; }
        .ProseMirror h2 { font-family: ${FONT}; font-size: 1.25rem; font-weight: 700; color: ${TEXT_DARK}; margin: 1.4em 0 0.4em; }
        .ProseMirror h3 { font-family: ${FONT}; font-size: 1.05rem; font-weight: 700; color: ${TEXT_DARK}; margin: 1.2em 0 0.3em; }
        .ProseMirror blockquote { border-left: 3px solid ${CRIMSON}; margin: 1em 0; padding: 0.1em 0 0.1em 1.2em; font-style: italic; color: #526270; }
        .ProseMirror ul { padding-left: 1.4em; margin: 0 0 1em; }
        .ProseMirror ol { padding-left: 1.4em; margin: 0 0 1em; }
        .ProseMirror li { margin-bottom: 0.25em; }
        .ProseMirror:focus { outline: none; }
      `}</style>
      <EditorContent editor={editor} />
    </>
  );
}
