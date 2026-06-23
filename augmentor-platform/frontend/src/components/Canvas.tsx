import React, { useRef, useEffect, useState } from "react";

interface Box {
  id: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Polygon {
  id: number;
  label: string;
  points: { x: number; y: number }[];
}

interface Props {
  image: string | null;
  boxes: Box[];
  setBoxes: React.Dispatch<React.SetStateAction<Box[]>>;
  polygons: Polygon[];
  setPolygons: (updater: any) => void;
  drawMode: boolean;
  polyMode: boolean;
  zoom: number;
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  setDrawMode?: (v: boolean) => void;
  setPolyMode?: (v: boolean) => void;
}

const HANDLE_SIZE = 8;
type ResizeCorner = "tl" | "tr" | "bl" | "br" | null;

const Canvas: React.FC<Props> = ({
  image,
  boxes,
  setBoxes,
  polygons,
  setPolygons,
  drawMode,
  polyMode,
  zoom,
  selectedId,
  setSelectedId,
  setDrawMode,
  setPolyMode
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<Box | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<ResizeCorner>(null);
  const [fitScale, setFitScale] = useState(1);

  // polygon-in-progress points
  const [polyPoints, setPolyPoints] = useState<{ x: number; y: number }[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  /* ================= IMAGE LOAD ================= */

  useEffect(() => {
    if (!image) return;
    const img = new Image();
    img.src = image;
    img.onload = () => {
      imgRef.current = img;
      computeFitScale();
      draw();
    };
    return () => { imgRef.current = null; };
  }, [image]);

  useEffect(() => {
    const resize = () => { computeFitScale(); draw(); };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  });

  useEffect(() => { draw(); }, [boxes, polygons, zoom, preview, selectedId, fitScale, polyPoints, mousePos]);

  /* ================= FIT SCALE ================= */

  const computeFitScale = () => {
    if (!imgRef.current || !containerRef.current) return;
    const img = imgRef.current;
    const container = containerRef.current;
    const scaleX = (container.clientWidth - 10) / img.width;
    const scaleY = (container.clientHeight - 10) / img.height;
    setFitScale(Math.min(scaleX, scaleY));
  };

  /* ================= DRAWING ================= */

  const drawHandles = (ctx: CanvasRenderingContext2D, box: Box) => {
    ctx.fillStyle = "lime";
    const corners = [
      [box.x, box.y],
      [box.x + box.width, box.y],
      [box.x, box.y + box.height],
      [box.x + box.width, box.y + box.height]
    ];
    corners.forEach(([cx, cy]) => {
      ctx.fillRect(cx * zoom * fitScale - HANDLE_SIZE / 2, cy * zoom * fitScale - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    });
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = zoom * fitScale;
    canvas.width = imgRef.current.width * scale;
    canvas.height = imgRef.current.height * scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);

    // draw bounding boxes
    boxes.forEach((box) => {
      const active = box.id === selectedId;
      ctx.strokeStyle = active ? "blue" : "red";
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x * scale, box.y * scale, box.width * scale, box.height * scale);
      ctx.fillStyle = active ? "blue" : "red";
      ctx.font = "14px Arial";
      ctx.fillText(box.label, box.x * scale + 4, box.y * scale - 6);
      if (active) drawHandles(ctx, box);
    });

    if (preview) {
      ctx.strokeStyle = "blue";
      ctx.strokeRect(preview.x * scale, preview.y * scale, preview.width * scale, preview.height * scale);
    }

    // draw completed polygons
    polygons.forEach((poly) => {
      if (poly.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(poly.points[0].x * scale, poly.points[0].y * scale);
      poly.points.slice(1).forEach(p => ctx.lineTo(p.x * scale, p.y * scale));
      ctx.closePath();
      ctx.strokeStyle = "orange";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,165,0,0.15)";
      ctx.fill();
      ctx.fillStyle = "orange";
      ctx.font = "14px Arial";
      ctx.fillText(poly.label, poly.points[0].x * scale + 4, poly.points[0].y * scale - 6);
      // vertex dots
      poly.points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x * scale, p.y * scale, 4, 0, Math.PI * 2);
        ctx.fillStyle = "orange";
        ctx.fill();
      });
    });

    // draw in-progress polygon
    if (polyMode && polyPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(polyPoints[0].x * scale, polyPoints[0].y * scale);
      polyPoints.slice(1).forEach(p => ctx.lineTo(p.x * scale, p.y * scale));
      if (mousePos) ctx.lineTo(mousePos.x * scale, mousePos.y * scale);
      ctx.strokeStyle = "cyan";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      // vertex dots
      polyPoints.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x * scale, p.y * scale, i === 0 ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? "yellow" : "cyan";
        ctx.fill();
      });
    }
  };

  /* ================= HELPERS ================= */

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scale = zoom * fitScale;
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  };

  const getBoxAt = (x: number, y: number) =>
    boxes.find(b => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height);

  const isNearFirstPoint = (pos: { x: number; y: number }) => {
    if (polyPoints.length < 3) return false;
    const first = polyPoints[0];
    const scale = zoom * fitScale;
    return Math.hypot((pos.x - first.x) * scale, (pos.y - first.y) * scale) < 10;
  };

  /* ================= MOUSE EVENTS ================= */

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e);

    if (polyMode) {
      if (isNearFirstPoint(pos)) {
        // close polygon
        const label = prompt("Enter Label:");
        if (!label) { setPolyPoints([]); return; }
        setPolygons(prev => [...prev, { id: Date.now(), label, points: polyPoints }]);
        setPolyPoints([]);
        setMousePos(null);
        if (setPolyMode) setPolyMode(false);
      } else {
        setPolyPoints(prev => [...prev, pos]);
      }
      return;
    }

    const clicked = getBoxAt(pos.x, pos.y);
    if (clicked) {
      setSelectedId(clicked.id);
      setDragging(true);
      setStart(pos);
      return;
    }

    if (drawMode) {
      setSelectedId(null);
      setStart(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getMousePos(e);

    if (polyMode) {
      setMousePos(pos);
      return;
    }

    if (dragging && start && selectedId !== null) {
      const dx = pos.x - start.x;
      const dy = pos.y - start.y;
      setBoxes(prev => prev.map(b => b.id === selectedId ? { ...b, x: b.x + dx, y: b.y + dy } : b));
      setStart(pos);
      return;
    }

    if (drawMode && start) {
      const width = pos.x - start.x;
      const height = pos.y - start.y;
      setPreview({
        id: 0, label: "",
        x: width < 0 ? pos.x : start.x,
        y: height < 0 ? pos.y : start.y,
        width: Math.abs(width),
        height: Math.abs(height)
      });
    }
  };

  const handleMouseUp = () => {
    if (polyMode) return;

    if (dragging) { setDragging(false); return; }
    if (!drawMode || !preview) return;

    const label = prompt("Enter Label:");
    if (!label) { setPreview(null); setStart(null); return; }

    setBoxes(prev => [...prev, { ...preview, id: Date.now(), label }]);
    if (setDrawMode) setDrawMode(false);
    setPreview(null);
    setStart(null);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!polyMode || polyPoints.length < 3) return;
    e.preventDefault();
    const label = prompt("Enter Label:");
    if (!label) { setPolyPoints([]); return; }
    setPolygons(prev => [...prev, { id: Date.now(), label, points: polyPoints }]);
    setPolyPoints([]);
    setMousePos(null);
    if (setPolyMode) setPolyMode(false);
  };

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <canvas
        ref={canvasRef}
        style={{ background: "#f3f4f6", cursor: polyMode ? "crosshair" : drawMode ? "crosshair" : "default" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />
    </div>
  );
};

export default Canvas;
