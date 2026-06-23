import os
import xml.etree.ElementTree as ET
from app.config import DATASET_DIR

class AnnotationService:

    @staticmethod
    def _unique_label_path(label: str) -> str:
        """Return a unique XML path in DATASET_DIR named after the label."""
        base = os.path.join(DATASET_DIR, f"{label}.xml")
        if not os.path.exists(base):
            return base
        i = 1
        while True:
            candidate = os.path.join(DATASET_DIR, f"{label}_{i}.xml")
            if not os.path.exists(candidate):
                return candidate
            i += 1

    @staticmethod
    def _build_annotation_element(image_path: str) -> ET.Element:
        annotation = ET.Element("annotation")
        ET.SubElement(annotation, "filename").text = image_path
        return annotation

    @staticmethod
    def save_pascal_voc(image_name, image_path, boxes, polygons=None):
        # Group all annotation objects by label
        from collections import defaultdict
        grouped: dict = defaultdict(list)

        for box in boxes:
            grouped[box.label].append(("bndbox", box))

        for poly in (polygons or []):
            grouped[poly.label].append(("polygon", poly))

        saved_paths = []

        for label, items in grouped.items():
            annotation = AnnotationService._build_annotation_element(image_path)

            for obj_type, item in items:
                obj = ET.SubElement(annotation, "object")
                ET.SubElement(obj, "name").text = label
                ET.SubElement(obj, "type").text = obj_type

                if obj_type == "bndbox":
                    bndbox = ET.SubElement(obj, "bndbox")
                    ET.SubElement(bndbox, "xmin").text = str(item.xmin)
                    ET.SubElement(bndbox, "ymin").text = str(item.ymin)
                    ET.SubElement(bndbox, "xmax").text = str(item.xmax)
                    ET.SubElement(bndbox, "ymax").text = str(item.ymax)
                else:
                    polygon_el = ET.SubElement(obj, "polygon")
                    for pt in item.points:
                        point_el = ET.SubElement(polygon_el, "pt")
                        ET.SubElement(point_el, "x").text = str(pt.x)
                        ET.SubElement(point_el, "y").text = str(pt.y)

            save_path = AnnotationService._unique_label_path(label)
            ET.ElementTree(annotation).write(save_path)
            saved_paths.append(save_path)

        return saved_paths
