import React, { useMemo } from "react";
import { Polygon } from "./Canvas";

interface Box {
  id: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  boxes: Box[];
  polygons: Polygon[];
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  setBoxes: any;
  images: File[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  allAnnotations: Record<string, Box[]>;
  allPolyAnnotations: Record<string, Polygon[]>;
}

const RightPanel: React.FC<Props> = ({
  boxes,
  polygons,
  selectedId,
  setSelectedId,
  setBoxes,
  images,
  currentIndex,
  setCurrentIndex,
  allAnnotations,
  allPolyAnnotations
}) => {

  const groupedLabels = useMemo(() => {
    const map: Record<string, { count: number; type: string }> = {};

    Object.values(allAnnotations).forEach((boxList) => {
      boxList.forEach((b) => {
        if (!map[b.label]) map[b.label] = { count: 0, type: "box" };
        map[b.label].count += 1;
      });
    });

    Object.values(allPolyAnnotations).forEach((polyList) => {
      polyList.forEach((p) => {
        if (!map[p.label]) map[p.label] = { count: 0, type: "polygon" };
        else map[p.label].type = "mixed";
        map[p.label].count += 1;
      });
    });

    return map;
  }, [allAnnotations, allPolyAnnotations]);

  const renameLabel = (labelName: string) => {
    const newName = prompt("Rename label:", labelName);
    if (!newName) return;
    setBoxes((prev: Box[]) =>
      prev.map(b => b.label === labelName ? { ...b, label: newName } : b)
    );
  };

  const typeColor = (type: string) => {
    if (type === "polygon") return "#f97316";
    if (type === "mixed") return "#8b5cf6";
    return "#3b82f6";
  };

  return (
    <div style={styles.panel}>
      {/* ================= LABELS ================= */}
      <div style={styles.labelsSection}>
        <h3 style={styles.sectionTitle}>Labels</h3>

        {Object.entries(groupedLabels).map(([name, { count, type }]) => (
          <div
            key={name}
            onDoubleClick={() => renameLabel(name)}
            style={styles.labelItem}
          >
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: typeColor(type),
                marginRight: 8
              }}
            />
            <strong>{name}</strong>
            <span style={{ marginLeft: 8, color: "#6b7280", fontSize: 12 }}>
              ({count}) {type === "polygon" ? "🖊" : type === "mixed" ? "🔀" : "▭"}
            </span>
          </div>
        ))}
      </div>

      {/* ================= IMAGES ================= */}
      <div style={styles.imagesSection}>
        <h3 style={styles.sectionTitle}>Images</h3>

        {images.map((img, index) => {
          const boxCount = (allAnnotations[img.name] || []).length;
          const polyCount = (allPolyAnnotations[img.name] || []).length;
          return (
            <div
              key={index}
              onClick={() => setCurrentIndex(index)}
              style={{
                ...styles.imageItem,
                background: index === currentIndex ? "#2563eb" : "#374151"
              }}
            >
              <div>{img.name}</div>
              {(boxCount > 0 || polyCount > 0) && (
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
                  {boxCount > 0 && `▭ ${boxCount}`}{boxCount > 0 && polyCount > 0 && "  "}{polyCount > 0 && `🖊 ${polyCount}`}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ marginTop: 10, fontSize: 13 }}>
          Progress: {images.length === 0 ? 0 : currentIndex + 1} / {images.length}
        </div>
      </div>
    </div>
  );
};

const styles = {
  panel: {
    width: 300,
    height: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    background: "#dbe7ed"
  },
  sectionTitle: { marginBottom: 10 },
  labelsSection: {
    flex: 1,
    overflowY: "auto" as const,
    padding: 10,
    borderBottom: "1px solid #94a3b8"
  },
  imagesSection: {
    flex: 1,
    overflowY: "auto" as const,
    padding: 10
  },
  labelItem: {
    padding: 8,
    marginBottom: 6,
    borderRadius: 6,
    background: "white",
    cursor: "pointer",
    display: "flex",
    alignItems: "center"
  },
  imageItem: {
    padding: 6,
    marginBottom: 4,
    borderRadius: 4,
    color: "white",
    cursor: "pointer",
    fontSize: 13
  }
};

export default RightPanel;
