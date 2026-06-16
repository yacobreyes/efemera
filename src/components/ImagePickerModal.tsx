"use client";

import { useState, useEffect } from "react";
import { uploadImage } from "@/app/admin/actions";

const CRIMSON = "#8B0000";
const BORDER = "#e1e8ed";
const TEXT_DARK = "#1c2938";
const TEXT_MUTED = "#526270";
const FONT = "var(--font-inter), sans-serif";

const INPUT: React.CSSProperties = {
  fontFamily: FONT, fontSize: "0.9rem", padding: "0.5rem 0.7rem",
  border: `1px solid ${BORDER}`, borderRadius: 4, width: "100%",
  boxSizing: "border-box", color: TEXT_DARK, outline: "none", background: "white",
};
const LABEL: React.CSSProperties = {
  fontFamily: FONT, fontSize: "0.75rem", fontWeight: 700,
  color: TEXT_MUTED, letterSpacing: "0.08em", textTransform: "uppercase",
  display: "block", marginBottom: "0.3rem",
};

export type PickedImage = { assetId: string; url: string; caption: string; alt: string };
type MediaAsset = { _id: string; url: string; originalFilename?: string; description?: string; altText?: string };

export default function ImagePickerModal({
  isMobile = false,
  onClose,
  onSelect,
}: {
  isMobile?: boolean;
  onClose: () => void;
  onSelect: (img: PickedImage) => void;
}) {
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [caption, setCaption] = useState("");
  const [alt, setAlt] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/media").then(r => r.json()).then(d => { if (Array.isArray(d)) setAssets(d); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleUse() {
    if (tab === "library" && selected) {
      onSelect({ assetId: selected._id, url: selected.url, caption, alt });
      onClose();
    } else if (tab === "upload" && uploadFile) {
      if (!caption.trim()) { alert("Please add a caption before using this image."); return; }
      setUploading(true);
      try {
        const fd = new FormData(); fd.set("file", uploadFile);
        const { assetId, url } = await uploadImage(fd);
        onSelect({ assetId, url, caption, alt });
        onClose();
      } catch { alert("Upload failed."); }
      finally { setUploading(false); }
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: isMobile ? 0 : 10, width: isMobile ? "100vw" : "min(880px, 95vw)", height: isMobile ? "100dvh" : "min(600px, 90vh)", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${BORDER}` }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: "1rem", margin: "0 0 0.75rem", color: TEXT_DARK }}>Add featured image</p>
          <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${BORDER}`, marginBottom: -1 }}>
            {(["library", "upload"] as const).map(t => (
              <button key={t} type="button" onClick={() => setTab(t)}
                style={{ background: "none", border: "none", borderBottom: `2px solid ${tab === t ? CRIMSON : "transparent"}`, marginBottom: -2, padding: "0.4rem 1rem", fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: tab === t ? CRIMSON : TEXT_MUTED, cursor: "pointer" }}>
                {t === "library" ? "Library" : "Upload new"}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
          {tab === "library" && (
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
                {loading ? (
                  <p style={{ fontFamily: FONT, color: TEXT_MUTED }}>Loading…</p>
                ) : assets.length === 0 ? (
                  <p style={{ fontFamily: FONT, color: TEXT_MUTED }}>No images in library yet.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.5rem" }}>
                    {assets.map(a => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={a._id} src={a.url} alt={a.originalFilename}
                        onClick={() => { setSelected(a); setCaption(a.description ?? ""); setAlt(a.altText ?? ""); }}
                        style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 4, cursor: "pointer", border: `2px solid ${selected?._id === a._id ? CRIMSON : "transparent"}`, boxSizing: "border-box" }} />
                    ))}
                  </div>
                )}
              </div>
              {selected && (
                <div style={{ width: 260, flexShrink: 0, borderLeft: `1px solid ${BORDER}`, padding: "1rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selected.url} alt="" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 6 }} />
                  <div><label style={LABEL}>Caption</label><input style={INPUT} value={caption} onChange={e => setCaption(e.target.value)} placeholder="Add a caption…" /></div>
                  <div><label style={LABEL}>Alt text</label><input style={INPUT} value={alt} onChange={e => setAlt(e.target.value)} placeholder="Describe this image…" /></div>
                </div>
              )}
            </>
          )}

          {tab === "upload" && (
            <div style={{ flex: 1, display: "flex", gap: "1.5rem", padding: "1.5rem", overflowY: "auto" }}>
              <div style={{ flex: 1 }}>
                {!uploadPreviewUrl ? (
                  <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: `2px dashed ${BORDER}`, borderRadius: 8, padding: "2.5rem 1rem", cursor: "pointer", textAlign: "center" }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: "0.75rem" }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <p style={{ fontFamily: FONT, fontSize: "0.9rem", color: TEXT_DARK, margin: "0 0 0.25rem", fontWeight: 600 }}>Drag image here or <span style={{ color: CRIMSON }}>click to upload</span></p>
                    <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: TEXT_MUTED, margin: 0 }}>JPEG, PNG, GIF, or WEBP</p>
                    <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (!f) return; setUploadFile(f); setUploadPreviewUrl(URL.createObjectURL(f)); }} style={{ display: "none" }} />
                  </label>
                ) : (
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={uploadPreviewUrl} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 6, marginBottom: "0.5rem" }} />
                    <button type="button" onClick={() => { setUploadFile(null); setUploadPreviewUrl(""); }} style={{ background: "none", border: "none", fontFamily: FONT, fontSize: "0.8rem", color: TEXT_MUTED, cursor: "pointer", padding: 0 }}>Remove</button>
                  </div>
                )}
              </div>
              <div style={{ width: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={LABEL}>Caption <span style={{ color: CRIMSON }}>*</span></label>
                  <input style={INPUT} value={caption} onChange={e => setCaption(e.target.value)} placeholder="Credit the original source…" />
                  <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: TEXT_MUTED, margin: "0.3rem 0 0" }}>Required before using this image</p>
                </div>
                <div><label style={LABEL}>Alt text</label><input style={INPUT} value={alt} onChange={e => setAlt(e.target.value)} placeholder="Describe this image…" /></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", padding: "0.85rem 1.5rem", borderTop: `1px solid ${BORDER}`, background: "#fafbfc" }}>
          <button type="button" onClick={onClose} style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 20, padding: "0.4rem 1.1rem", fontFamily: FONT, fontSize: "0.88rem", cursor: "pointer", color: TEXT_DARK }}>Cancel</button>
          <button type="button" onClick={handleUse} disabled={uploading || (tab === "library" && !selected) || (tab === "upload" && (!uploadFile || !caption.trim()))}
            style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 20, padding: "0.4rem 1.1rem", fontFamily: FONT, fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", opacity: (tab === "library" && !selected) || (tab === "upload" && (!uploadFile || !caption.trim())) ? 0.5 : 1 }}>
            {uploading ? "Uploading…" : "Use this image"}
          </button>
        </div>
      </div>
    </div>
  );
}
