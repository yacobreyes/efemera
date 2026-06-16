"use client";

import { useEffect, useState, useCallback } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import type { JSONContent } from "@tiptap/react";

const CRIMSON = "#8B0000";
const TEXT_DARK = "#1c2938";
const BORDER = "#e1e8ed";
const FONT = "'Inter', sans-serif";

export interface ToolbarHandles {
  openLink: () => void;
  openImage: () => void;
  openEmbed: () => void;
}

interface Props {
  initialContent: JSONContent;
  onChange: (doc: JSONContent) => void;
  onEditor?: (editor: Editor | null) => void;
  onToolbar?: (handles: ToolbarHandles | null) => void;
  minHeight?: number;
  placeholder?: string;
}

export default function RichBodyEditor({ initialContent, onChange, onEditor, onToolbar, minHeight = 320, placeholder = "Type your story" }: Props) {
  const [linkModal, setLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageModal, setImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [embedModal, setEmbedModal] = useState(false);
  const [embedUrl, setEmbedUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
      Youtube.configure({ width: 640, height: 360, nocookie: true }),
    ],
    content: initialContent,
    onUpdate({ editor }) {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        style: [
          "min-height:" + minHeight + "px",
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
      handleKeyDown(view, event) {
        // Cmd+K / Ctrl+K → open link modal
        if ((event.metaKey || event.ctrlKey) && event.key === "k") {
          event.preventDefault();
          return true; // handled via useEffect below
        }
        return false;
      },
    },
  });

  // Cmd+K listener
  useEffect(() => {
    if (!editor) return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const existing = editor!.getAttributes("link").href ?? "";
        setLinkUrl(existing);
        setLinkModal(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor]);

  useEffect(() => {
    onEditor?.(editor ?? null);
    return () => onEditor?.(null);
  }, [editor]);

  useEffect(() => {
    if (!editor) { onToolbar?.(null); return; }
    onToolbar?.({
      openLink: () => { setLinkUrl(editor.getAttributes("link").href ?? ""); setLinkModal(true); },
      openImage: () => { setImageUrl(""); setImageModal(true); },
      openEmbed: () => { setEmbedUrl(""); setEmbedModal(true); },
    });
    return () => onToolbar?.(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(initialContent);
    if (current !== next) editor.commands.setContent(initialContent);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      const href = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().setLink({ href }).run();
    }
    setLinkModal(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const applyImage = useCallback(() => {
    if (!editor || !imageUrl.trim()) return;
    editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
    setImageModal(false);
    setImageUrl("");
  }, [editor, imageUrl]);

  const applyEmbed = useCallback(() => {
    if (!editor || !embedUrl.trim()) return;
    editor.chain().focus().setYoutubeVideo({ src: embedUrl.trim() }).run();
    setEmbedModal(false);
    setEmbedUrl("");
  }, [editor, embedUrl]);

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
        .ProseMirror ul { list-style-type: disc; padding-left: 1.4em; margin: 0 0 1em; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.4em; margin: 0 0 1em; }
        .ProseMirror li { margin-bottom: 0.25em; display: list-item; }
        .ProseMirror li p { margin: 0; }
        .ProseMirror a { color: ${CRIMSON}; text-decoration: underline; cursor: pointer; }
        .ProseMirror img { max-width: 100%; border-radius: 4px; margin: 0.5em 0; display: block; }
        .ProseMirror iframe { max-width: 100%; border-radius: 4px; margin: 0.5em 0; }
        .ProseMirror:focus { outline: none; }
        .editor-modal-overlay { position: fixed; inset: 0; zIndex: 500; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; }
        .editor-modal { background: white; border-radius: 8px; padding: 1.25rem; width: 360px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); display: flex; flex-direction: column; gap: 0.75rem; }
      `}</style>

      <EditorContent editor={editor} />

      {/* Link modal */}
      {linkModal && (
        <div className="editor-modal-overlay" onClick={() => setLinkModal(false)}>
          <div className="editor-modal" onClick={e => e.stopPropagation()}>
            <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: "0.9rem", margin: 0, color: TEXT_DARK }}>Insert link</p>
            <input
              autoFocus
              placeholder="https://..."
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") applyLink(); if (e.key === "Escape") setLinkModal(false); }}
              style={{ fontFamily: FONT, fontSize: "0.9rem", padding: "0.5rem 0.7rem", border: `1px solid ${BORDER}`, borderRadius: 4, outline: "none", width: "100%", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              {editor.isActive("link") && (
                <button type="button" onClick={() => { editor.chain().focus().unsetLink().run(); setLinkModal(false); }} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "0.4rem 0.8rem", fontFamily: FONT, fontSize: "0.85rem", cursor: "pointer", color: "#657786" }}>Remove</button>
              )}
              <button type="button" onClick={() => setLinkModal(false)} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "0.4rem 0.8rem", fontFamily: FONT, fontSize: "0.85rem", cursor: "pointer", color: "#657786" }}>Cancel</button>
              <button type="button" onClick={applyLink} style={{ background: CRIMSON, border: "none", borderRadius: 4, padding: "0.4rem 0.8rem", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", color: "white" }}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Image modal */}
      {imageModal && (
        <div className="editor-modal-overlay" onClick={() => setImageModal(false)}>
          <div className="editor-modal" onClick={e => e.stopPropagation()}>
            <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: "0.9rem", margin: 0, color: TEXT_DARK }}>Insert image</p>
            <input
              autoFocus
              placeholder="https://..."
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") applyImage(); if (e.key === "Escape") setImageModal(false); }}
              style={{ fontFamily: FONT, fontSize: "0.9rem", padding: "0.5rem 0.7rem", border: `1px solid ${BORDER}`, borderRadius: 4, outline: "none", width: "100%", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setImageModal(false)} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "0.4rem 0.8rem", fontFamily: FONT, fontSize: "0.85rem", cursor: "pointer", color: "#657786" }}>Cancel</button>
              <button type="button" onClick={applyImage} disabled={!imageUrl.trim()} style={{ background: CRIMSON, border: "none", borderRadius: 4, padding: "0.4rem 0.8rem", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", color: "white", opacity: imageUrl.trim() ? 1 : 0.5 }}>Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* Embed modal */}
      {embedModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setEmbedModal(false)}>
          <div style={{ background: "white", borderRadius: 12, padding: "1.5rem", width: 420, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: "1rem", margin: 0, color: TEXT_DARK }}>Embed</p>
              <button type="button" onClick={() => setEmbedModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#657786", display: "flex", alignItems: "center", padding: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <label style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "#657786", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>URL</label>
            <input
              autoFocus
              placeholder="Enter a URL"
              value={embedUrl}
              onChange={e => setEmbedUrl(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") applyEmbed(); if (e.key === "Escape") setEmbedModal(false); }}
              style={{ fontFamily: FONT, fontSize: "0.9rem", padding: "0.55rem 0.8rem", border: `1.5px solid #c8d3db`, borderRadius: 8, outline: "none", width: "100%", boxSizing: "border-box", marginBottom: "1.25rem" }}
            />
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setEmbedModal(false)} style={{ background: "none", border: `1.5px solid #c8d3db`, borderRadius: 20, padding: "0.45rem 1.1rem", fontFamily: FONT, fontSize: "0.88rem", cursor: "pointer", color: TEXT_DARK }}>Cancel</button>
              <button type="button" onClick={applyEmbed} disabled={!embedUrl.trim()} style={{ background: embedUrl.trim() ? "#6b8cba" : "#c8d3db", border: "none", borderRadius: 20, padding: "0.45rem 1.1rem", fontFamily: FONT, fontSize: "0.88rem", fontWeight: 600, cursor: embedUrl.trim() ? "pointer" : "default", color: "white" }}>Embed</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
