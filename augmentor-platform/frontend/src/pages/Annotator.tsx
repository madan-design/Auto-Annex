import React, { useState, useRef, useEffect } from "react";
import Ribbon from "../components/Ribbon";
import Canvas, { Polygon } from "../components/Canvas";
import RightPanel from "../components/RightPanel";

interface Box {
  id: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const Annotator = () => {
  const [images, setImages] = useState<File[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [annotations, setAnnotations] = useState<Record<string, Box[]>>({});
  const [polyAnnotations, setPolyAnnotations] = useState<Record<string, Polygon[]>>({});

  const [drawMode, setDrawMode] = useState(false);
  const [polyMode, setPolyMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const currentImage = images[currentIndex];
  const imageName = currentImage?.name || "";
  const imagePath = (currentImage as any)?.webkitRelativePath || imageName;

  const boxes = annotations[imageName] || [];
  const polygons = polyAnnotations[imageName] || [];

  const setBoxes = (updater: any) => {
    setAnnotations(prev => {
      const current = prev[imageName] || [];
      const newBoxes = typeof updater === "function" ? updater(current) : updater;
      return { ...prev, [imageName]: newBoxes };
    });
  };

  const setPolygons = (updater: any) => {
    setPolyAnnotations(prev => {
      const current = prev[imageName] || [];
      const newPolys = typeof updater === "function" ? updater(current) : updater;
      return { ...prev, [imageName]: newPolys };
    });
  };

  useEffect(() => {
    document.body.style.background = darkMode ? "#111827" : "#f3f4f6";
  }, [darkMode]);

  const openDir = () => inputRef.current?.click();

  const next = () => {
    if (currentIndex < images.length - 1) { setCurrentIndex(p => p + 1); setSelectedId(null); }
  };

  const prev = () => {
    if (currentIndex > 0) { setCurrentIndex(p => p - 1); setSelectedId(null); }
  };

  /* LOAD XML */
  useEffect(() => {
    if (!imageName) return;

    fetch(`http://127.0.0.1:8000/annotation/${imageName}`)
      .then(res => res.json())
      .then(data => {
        const loadedBoxes = data.boxes?.map((b: any) => ({
          id: Date.now() + Math.random(),
          label: b.label,
          x: b.xmin,
          y: b.ymin,
          width: b.xmax - b.xmin,
          height: b.ymax - b.ymin
        })) || [];

        const loadedPolys = data.polygons?.map((p: any) => ({
          id: Date.now() + Math.random(),
          label: p.label,
          points: p.points
        })) || [];

        setAnnotations(prev => ({ ...prev, [imageName]: loadedBoxes }));
        setPolyAnnotations(prev => ({ ...prev, [imageName]: loadedPolys }));
      })
      .catch(() => {});
  }, [imageName]);

  const actions = {
    openDir,

    save: async () => {
      if (!currentImage) return;

      const payload = {
        image_name: currentImage.name,
        image_path: imagePath,
        boxes: boxes.map(b => ({
          label: b.label,
          xmin: Math.round(b.x),
          ymin: Math.round(b.y),
          xmax: Math.round(b.x + b.width),
          ymax: Math.round(b.y + b.height)
        })),
        polygons: polygons.map(p => ({
          label: p.label,
          points: p.points.map(pt => ({ x: Math.round(pt.x), y: Math.round(pt.y) }))
        }))
      };

      try {
        const res = await fetch("http://127.0.0.1:8000/annotation/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error();
        alert("✅ Annotation saved successfully!");
      } catch {
        alert("❌ Backend not reachable");
      }
    },

    drawMode: () => { setDrawMode(true); setPolyMode(false); setActiveTool("rect"); },
    polyMode: () => { setPolyMode(true); setDrawMode(false); setActiveTool("poly"); },

    next,
    prev,
    deleteBox: () => { setBoxes([]); setPolygons([]); },
    zoomIn: () => setZoom(z => z + 0.1),
    zoomOut: () => setZoom(z => Math.max(0.5, z - 0.1)),
    toggleTheme: () => setDarkMode(p => !p)
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "o") { e.preventDefault(); openDir(); }
      if (e.key === "d") next();
      if (e.key === "a") prev();
      if (e.key === "s") actions.save();
      if (e.key === "w") actions.drawMode();
      if (e.key === "f") actions.polyMode();
      if (e.key === "Delete") actions.deleteBox();
      if (e.key === "+") actions.zoomIn();
      if (e.key === "-") actions.zoomOut();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Ribbon
        actions={actions}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        darkMode={darkMode}
      />

      <div style={{ flex: 1, padding: 12 }}>
        <input
          type="file"
          multiple
          ref={inputRef}
          style={{ display: "none" }}
          {...({ webkitdirectory: "true", directory: "" } as any)}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            setImages(files.filter(f => f.type.startsWith("image/")));
            setCurrentIndex(0);
            setSelectedId(null);
          }}
        />

        {currentImage && (
          <Canvas
            image={URL.createObjectURL(currentImage)}
            boxes={boxes}
            setBoxes={setBoxes}
            polygons={polygons}
            setPolygons={setPolygons}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            drawMode={drawMode}
            setDrawMode={setDrawMode}
            polyMode={polyMode}
            setPolyMode={setPolyMode}
            zoom={zoom}
          />
        )}
      </div>

      <RightPanel
        boxes={boxes}
        polygons={polygons}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        setBoxes={setBoxes}
        images={images}
        currentIndex={currentIndex}
        setCurrentIndex={setCurrentIndex}
        allAnnotations={annotations}
        allPolyAnnotations={polyAnnotations}
      />
    </div>
  );
};

export default Annotator;
