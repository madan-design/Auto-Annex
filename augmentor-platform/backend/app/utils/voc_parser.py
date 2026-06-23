import xml.etree.ElementTree as ET


def parse_voc(xml_path):
    """
    Parse Pascal VOC XML annotation safely.
    Returns:
        [
            {
                "label": "damage",
                "bbox": [xmin, ymin, xmax, ymax]
            }
        ]
    """

    boxes = []

    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()

    except Exception as e:
        print(f"[VOC ERROR] Cannot parse XML: {xml_path} -> {e}")
        return boxes

    for obj in root.findall("object"):

        try:
            name_tag = obj.find("name")
            if name_tag is None:
                continue

            obj_type = obj.find("type")

            if obj_type is not None and obj_type.text == "polygon":
                polygon_el = obj.find("polygon")
                if polygon_el is None:
                    continue
                pts = [[int(pt.find("x").text), int(pt.find("y").text)] for pt in polygon_el.findall("pt")]
                if len(pts) < 3:
                    continue
                xs = [p[0] for p in pts]
                ys = [p[1] for p in pts]
                boxes.append({
                    "label": name_tag.text.strip(),
                    "bbox": [min(xs), min(ys), max(xs), max(ys)],
                    "polygon": pts
                })
            else:
                bbox = obj.find("bndbox")
                if bbox is None:
                    continue

                xmin_tag = bbox.find("xmin")
                ymin_tag = bbox.find("ymin")
                xmax_tag = bbox.find("xmax")
                ymax_tag = bbox.find("ymax")

                if None in (xmin_tag, ymin_tag, xmax_tag, ymax_tag):
                    continue

                boxes.append({
                    "label": name_tag.text.strip(),
                    "bbox": [
                        int(float(xmin_tag.text)),
                        int(float(ymin_tag.text)),
                        int(float(xmax_tag.text)),
                        int(float(ymax_tag.text))
                    ]
                })

        except Exception as e:
            print(f"[VOC WARNING] Skipping invalid object in {xml_path} -> {e}")
            continue

    if len(boxes) == 0:
        print(f"[VOC WARNING] No boxes found in {xml_path}")

    return boxes