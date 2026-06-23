import React from "react";

import openIcon from "../assets/icons/open.png";
import saveIcon from "../assets/icons/save.png";
import rectIcon from "../assets/icons/createrectbox.png";
import freeDrawIcon from "../assets/icons/free_draw.png";
import nextIcon from "../assets/icons/next.png";
import prevIcon from "../assets/icons/previous.png";
import deleteIcon from "../assets/icons/delete.png";
import zoomInIcon from "../assets/icons/zoomin.png";
import zoomOutIcon from "../assets/icons/zoomout.png";
import themeIcon from "../assets/icons/theme.png";

interface Props {
  activeTool: string | null;
  setActiveTool: (tool: string | null) => void;
  darkMode: boolean;
  actions: {
    openDir: () => void;
    save: () => void;
    drawMode: () => void;
    polyMode: () => void;
    next: () => void;
    prev: () => void;
    deleteBox: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    toggleTheme: () => void;
  };
}

const Ribbon: React.FC<Props> = ({
  actions,
  activeTool,
  setActiveTool,
  darkMode
}) => {
  const Btn = ({
    icon,
    label,
    onClick,
    tool
  }: {
    icon: string;
    label: string;
    onClick: () => void;
    tool?: string;
  }) => (
    <button
      title={label}
      onClick={() => {
        onClick();
        if (tool) setActiveTool(tool);
      }}
      style={{
        ...styles.btn,
        background:
          activeTool === tool
            ? "#2563eb"
            : darkMode
            ? "#1f2937"
            : "#e5e7eb"
      }}
    >
      <img src={icon} style={styles.icon} />
      <span style={styles.label}>{label}</span>
    </button>
  );

  return (
    <div
      style={{
        ...styles.ribbon,
        background: darkMode ? "#111827" : "#e6eef2"
      }}
    >
      <Btn icon={openIcon} label="Open Dir (Ctrl+O)" onClick={actions.openDir} />
      <Btn icon={saveIcon} label="Save (S)" onClick={actions.save} />
      <Btn
        icon={rectIcon}
        label="Rect Box (W)"
        onClick={actions.drawMode}
        tool="rect"
      />
      <Btn
        icon={freeDrawIcon}
        label="Free Draw (F)"
        onClick={actions.polyMode}
        tool="poly"
      />
      <Btn icon={nextIcon} label="Next (D)" onClick={actions.next} />
      <Btn icon={prevIcon} label="Previous (A)" onClick={actions.prev} />
      <Btn icon={deleteIcon} label="Delete (Del)" onClick={actions.deleteBox} />
      <Btn icon={zoomInIcon} label="Zoom In (+)" onClick={actions.zoomIn} />
      <Btn icon={zoomOutIcon} label="Zoom Out (-)" onClick={actions.zoomOut} />
      <Btn icon={themeIcon} label="Theme" onClick={actions.toggleTheme} />
    </div>
  );
};

const styles: any = {
  ribbon: {
    width: "90px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: 10,
    gap: 10,
    borderRight: "1px solid #cbd5e1",
    height: "100vh"
  },
  btn: {
    width: 72,
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    padding: 6,
    transition: "0.2s",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  icon: {
    width: 36,
    height: 36,
    marginBottom: 4
  },
  label: {
    fontSize: 11
  }
};

export default Ribbon;