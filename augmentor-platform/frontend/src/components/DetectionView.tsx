import React, { useState, useEffect, useRef } from "react";
import { api } from "../services/api";

const BASE = "http://127.0.0.1:8000";

type Detection = { label: string; score: number; box: number[] };
type Mode = "image" | "video";

const DetectionView: React.FC = () => {

  const [models,        setModels]        = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [confidence,    setConfidence]    = useState(0.4);
  const [mode,          setMode]          = useState<Mode>("image");

  const [inputPreview,  setInputPreview]  = useState<string | null>(null);
  const [resultImage,   setResultImage]   = useState<string | null>(null);
  const [resultVideo,   setResultVideo]   = useState<string | null>(null);
  const [detections,    setDetections]    = useState<Detection[]>([]);

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── load models on mount ──────────────────────────────
  useEffect(() => {
    api.getDetectionModels()
      .then(res => {
        if (res?.models?.length) {
          setModels(res.models);
          setSelectedModel(res.models[0]);
        }
      })
      .catch(() => {});
  }, []);

  // ── handle file pick ──────────────────────────────────
  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResultImage(null);
    setResultVideo(null);
    setDetections([]);
    setError(null);

    // local preview
    const url = URL.createObjectURL(file);
    setInputPreview(url);

    setLoading(true);
    try {
      if (mode === "image") {
        const res = await api.runDetection(selectedModel, file, confidence);
        if (res?.error) { setError(res.error); return; }
        setResultImage(BASE + res.result_image + `?t=${Date.now()}`);
        setDetections(res.detections ?? []);
      } else {
        const res = await (api as any).runVideoDetection(selectedModel, file, confidence);
        if (res?.error) { setError(res.error); return; }
        setResultVideo(BASE + res.result_video + `?t=${Date.now()}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      // reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const accept = mode === "image" ? "image/*" : "video/*";

  return (
    <div style={s.page}>

      {/* ── HEADER ── */}
      <div style={s.header}>
        <h2 style={s.title}>🔍 YOLOv8 Detection</h2>

        {/* mode toggle */}
        <div style={s.modeToggle}>
          {(["image","video"] as Mode[]).map(m => (
            <button
              key={m}
              style={{ ...s.modeBtn, ...(mode === m ? s.modeBtnActive : {}) }}
              onClick={() => { setMode(m); setInputPreview(null); setResultImage(null); setResultVideo(null); setDetections([]); }}
            >
              {m === "image" ? "🖼 Image" : "🎬 Video"}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div style={s.controls}>

        {/* model selector */}
        <div style={s.controlGroup}>
          <label style={s.label}>Model</label>
          <select
            style={s.select}
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
          >
            {models.length === 0
              ? <option value="">— No models trained yet —</option>
              : models.map(m => <option key={m} value={m}>{m}</option>)
            }
          </select>
        </div>

        {/* confidence */}
        <div style={s.controlGroup}>
          <label style={s.label}>Confidence: <b>{confidence.toFixed(2)}</b></label>
          <input
            type="range" min={0.1} max={0.95} step={0.05}
            value={confidence}
            onChange={e => setConfidence(Number(e.target.value))}
            style={{ width: 160 }}
          />
        </div>

        {/* upload button */}
        <button
          style={{ ...s.uploadBtn, opacity: !selectedModel || loading ? 0.5 : 1 }}
          disabled={!selectedModel || loading}
          onClick={() => fileInputRef.current?.click()}
        >
          {loading ? "⏳ Processing..." : `📂 Upload & Detect ${mode === "video" ? "Video" : "Image"}`}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          style={{ display: "none" }}
          onChange={handleFilePick}
        />
      </div>

      {/* ── ERROR ── */}
      {error && <div style={s.errorBox}>❌ {error}</div>}

      {/* ── MAIN AREA ── */}
      <div style={s.mainArea}>

        {/* LEFT — input */}
        <div style={s.panel}>
          <div style={s.panelTitle}>Input {fileName && <span style={s.fileName}>{fileName}</span>}</div>
          <div style={s.imageBox}>
            {inputPreview
              ? mode === "image"
                ? <img src={inputPreview} style={s.img} alt="input" />
                : <video src={inputPreview} controls style={s.img} />
              : <div style={s.placeholder}>No file selected</div>
            }
          </div>
        </div>

        {/* RIGHT — result */}
        <div style={s.panel}>
          <div style={s.panelTitle}>
            Detection Result
            {detections.length > 0 && (
              <span style={s.badge}>{detections.length} object{detections.length > 1 ? "s" : ""}</span>
            )}
          </div>
          <div style={s.imageBox}>
            {loading
              ? <div style={s.placeholder}>⏳ Running YOLOv8...</div>
              : resultImage
                ? <img src={resultImage} style={s.img} alt="result" />
                : resultVideo
                  ? <video src={resultVideo} controls style={s.img} />
                  : <div style={s.placeholder}>Result will appear here</div>
            }
          </div>
        </div>
      </div>

      {/* ── DETECTION LIST ── */}
      {detections.length > 0 && (
        <div style={s.detectionList}>
          <div style={s.panelTitle}>Detected Objects</div>
          <div style={s.detectionGrid}>
            {detections.map((d, i) => (
              <div key={i} style={s.detectionCard}>
                <span style={s.detLabel}>{d.label}</span>
                <span style={{
                  ...s.detScore,
                  background: d.score >= 0.7 ? "#22c55e" : d.score >= 0.5 ? "#f59e0b" : "#ef4444"
                }}>
                  {(d.score * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default DetectionView;


// ── STYLES ────────────────────────────────────────────
const s: any = {
  page:        { padding: 20, background: "#f0f0f4", minHeight: "100vh", fontFamily: "Arial, sans-serif" },
  header:      { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title:       { margin: 0, fontSize: 22 },
  modeToggle:  { display: "flex", gap: 8 },
  modeBtn:     { padding: "6px 18px", border: "2px solid #aaa", borderRadius: 20, cursor: "pointer", background: "#fff", fontWeight: 600 },
  modeBtnActive: { background: "#4f46e5", color: "#fff", borderColor: "#4f46e5" },

  controls:    { display: "flex", alignItems: "center", gap: 20, background: "#fff", padding: "12px 16px", borderRadius: 10, marginBottom: 16, flexWrap: "wrap" },
  controlGroup:{ display: "flex", flexDirection: "column", gap: 4 },
  label:       { fontSize: 12, color: "#555" },
  select:      { padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", minWidth: 180 },
  uploadBtn:   { padding: "10px 24px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14, marginLeft: "auto" },

  errorBox:    { background: "#fee2e2", color: "#b91c1c", padding: "10px 16px", borderRadius: 8, marginBottom: 12 },

  mainArea:    { display: "flex", gap: 16 },
  panel:       { flex: 1, background: "#fff", borderRadius: 10, overflow: "hidden" },
  panelTitle:  { background: "#4f46e5", color: "#fff", padding: "8px 14px", fontWeight: 700, display: "flex", alignItems: "center", gap: 10 },
  fileName:    { fontWeight: 400, fontSize: 12, opacity: 0.85 },
  badge:       { background: "#22c55e", borderRadius: 12, padding: "2px 10px", fontSize: 12 },
  imageBox:    { padding: 12, minHeight: 360, display: "flex", alignItems: "center", justifyContent: "center" },
  img:         { maxWidth: "100%", maxHeight: 480, borderRadius: 6, objectFit: "contain" },
  placeholder: { color: "#aaa", fontSize: 14 },

  detectionList: { marginTop: 16, background: "#fff", borderRadius: 10, overflow: "hidden" },
  detectionGrid: { display: "flex", flexWrap: "wrap", gap: 10, padding: 14 },
  detectionCard: { display: "flex", alignItems: "center", gap: 8, background: "#f5f5f5", borderRadius: 8, padding: "6px 12px" },
  detLabel:    { fontWeight: 600, fontSize: 14 },
  detScore:    { color: "#fff", borderRadius: 10, padding: "2px 8px", fontSize: 12, fontWeight: 700 },
};
