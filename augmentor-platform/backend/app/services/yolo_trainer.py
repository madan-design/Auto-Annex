import os
import shutil
import threading
import xml.etree.ElementTree as ET
from pathlib import Path

from app.services.dataset_builder import DatasetBuilder

training_state = {"status": "Idle", "progress": ""}


def voc_xml_to_yolo(xml_path: str, img_w: int, img_h: int, class_map: dict) -> list[str]:
    lines = []
    root = ET.parse(xml_path).getroot()
    for obj in root.findall("object"):
        name = obj.find("name").text.strip()
        if name not in class_map:
            continue
        cls_id = class_map[name]
        bb   = obj.find("bndbox")
        xmin = float(bb.find("xmin").text)
        ymin = float(bb.find("ymin").text)
        xmax = float(bb.find("xmax").text)
        ymax = float(bb.find("ymax").text)
        cx = ((xmin + xmax) / 2) / img_w
        cy = ((ymin + ymax) / 2) / img_h
        w  = (xmax - xmin) / img_w
        h  = (ymax - ymin) / img_h
        lines.append(f"{cls_id} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}")
    return lines


class YOLOTrainer:

    def __init__(self, folders: list, model_name: str):
        self.folders    = folders
        self.model_name = model_name

    # ─────────────────────────────────────────────────────────
    # BUILD PROPER YOLO DATASET STRUCTURE
    #
    # YOLO auto-discovers labels by replacing "images" with
    # "labels" in the path.  So we build:
    #
    #   yolo_dataset/
    #     images/train/   ← jpg/png files
    #     labels/train/   ← matching .txt files  (YOLO format)
    #     dataset.yaml
    # ─────────────────────────────────────────────────────────
    def _build_yolo_dataset(self):
        # Let DatasetBuilder copy images + VOC XMLs into training_dataset/
        raw_path, _ = DatasetBuilder.build(self.folders)
        raw_path    = Path(raw_path)

        src_images = raw_path / "images"
        src_labels = raw_path / "labels"   # VOC XML files

        # Fresh YOLO-structured output next to training_dataset/
        yolo_root  = raw_path.parent / "yolo_dataset"
        if yolo_root.exists():
            shutil.rmtree(yolo_root)

        dst_images = yolo_root / "images" / "train"
        dst_labels = yolo_root / "labels" / "train"
        dst_images.mkdir(parents=True)
        dst_labels.mkdir(parents=True)

        # ── collect class names from all XMLs first ──────────
        class_names: list[str] = []
        for xml_file in src_labels.glob("*.xml"):
            try:
                root = ET.parse(xml_file).getroot()
                for obj in root.findall("object"):
                    name = obj.find("name").text.strip()
                    if name not in class_names:
                        class_names.append(name)
            except Exception:
                pass

        if not class_names:
            return None, class_names, 0

        class_map = {n: i for i, n in enumerate(class_names)}

        # ── convert each image + XML pair ────────────────────
        import cv2
        count = 0
        for img_file in src_images.iterdir():
            if img_file.suffix.lower() not in (".jpg", ".jpeg", ".png"):
                continue

            xml_file = src_labels / (img_file.stem + ".xml")
            if not xml_file.exists():
                continue

            img = cv2.imread(str(img_file))
            if img is None:
                continue

            h, w = img.shape[:2]
            lines = voc_xml_to_yolo(str(xml_file), w, h, class_map)
            if not lines:
                continue

            # copy image
            shutil.copy(img_file, dst_images / img_file.name)

            # write YOLO txt
            (dst_labels / (img_file.stem + ".txt")).write_text("\n".join(lines))
            count += 1

        return yolo_root, class_names, count

    # ─────────────────────────────────────────────────────────
    # WRITE dataset.yaml  (standard YOLO format)
    # ─────────────────────────────────────────────────────────
    def _write_yaml(self, yolo_root: Path, class_names: list) -> str:
        yaml_path = yolo_root / "dataset.yaml"
        yaml_path.write_text(
            f"path: {yolo_root.as_posix()}\n"
            f"train: images/train\n"
            f"val:   images/train\n"
            f"nc: {len(class_names)}\n"
            f"names: {class_names}\n"
        )
        return str(yaml_path)

    # ─────────────────────────────────────────────────────────
    # TRAIN
    # ─────────────────────────────────────────────────────────
    def train(self):
        global training_state
        try:
            training_state["status"] = "Building dataset..."

            yolo_root, class_names, count = self._build_yolo_dataset()

            if count == 0 or yolo_root is None:
                training_state["status"] = "ERROR: No labelled images found. Make sure augmented folders have XML labels."
                return

            training_state["status"] = f"Dataset ready — {count} images, classes: {class_names}"

            yaml_path = self._write_yaml(yolo_root, class_names)

            epochs = 20 if count <= 200 else (40 if count <= 1000 else 60)

            training_state["status"] = f"Training YOLOv8 — {epochs} epochs, {count} images..."

            from ultralytics import YOLO
            model = YOLO("yolov8n.pt")

            os.makedirs("models", exist_ok=True)

            model.train(
                data=yaml_path,
                epochs=epochs,
                imgsz=640,
                batch=8,
                name=self.model_name,
                exist_ok=True,
                verbose=False,
            )

            # YOLO saves to runs/detect/<name>/weights/best.pt by default
            best_pt = Path("runs") / "detect" / self.model_name / "weights" / "best.pt"
            # also check runs/detect/models/<name> in case project was set
            if not best_pt.exists():
                best_pt = Path("runs") / "detect" / "models" / self.model_name / "weights" / "best.pt"

            # If a model with this name already exists, add timestamp suffix
            dest_pt = Path("models") / f"{self.model_name}.pt"
            if dest_pt.exists():
                from datetime import datetime
                stamp   = datetime.now().strftime("%Y%m%d_%H%M%S")
                dest_pt = Path("models") / f"{self.model_name}_{stamp}.pt"

            if best_pt.exists():
                shutil.copy(best_pt, dest_pt)
                training_state["status"] = f"Training Complete → {dest_pt.name}"
            else:
                training_state["status"] = "Training Complete (best.pt not found — check runs/)"

        except Exception as e:
            import traceback
            traceback.print_exc()
            training_state["status"] = f"ERROR: {e}"

    def start(self):
        threading.Thread(target=self.train, daemon=True).start()
