from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.schemas import AnnotationRequest
from app.services.annotation_service import AnnotationService
import os
import xml.etree.ElementTree as ET

router = APIRouter()

@router.get("/labels")
def get_labels():
    labels = set()
    dataset_dir = "datasets"
    for f in os.listdir(dataset_dir):
        if not f.endswith(".xml"):
            continue
        tree = ET.parse(os.path.join(dataset_dir, f))
        root = tree.getroot()
        for obj in root.findall("object"):
            labels.add(obj.find("name").text)
    return {"labels": list(labels)}


@router.post("/save")
def save_annotation(request: AnnotationRequest):
    paths = AnnotationService.save_pascal_voc(
        request.image_name,
        request.image_path,
        request.boxes,
        request.polygons
    )
    return {"annotation_saved": paths}


@router.get("/{image_name}")
def load_annotation(image_name: str):
    boxes = []
    polygons = []

    for f in os.listdir("datasets"):
        if not f.endswith(".xml"):
            continue

        xml_path = os.path.join("datasets", f)
        try:
            tree = ET.parse(xml_path)
            root = tree.getroot()
        except ET.ParseError:
            continue

        filename_el = root.find("filename")
        if filename_el is None:
            continue

        # match by image name (handle full relative paths)
        stored = os.path.basename(filename_el.text or "")
        if stored != image_name:
            continue

        for obj in root.findall("object"):
            label = obj.find("name").text
            obj_type = obj.find("type")

            if obj_type is not None and obj_type.text == "polygon":
                polygon_el = obj.find("polygon")
                if polygon_el is None:
                    continue
                points = [
                    {"x": int(pt.find("x").text), "y": int(pt.find("y").text)}
                    for pt in polygon_el.findall("pt")
                ]
                polygons.append({"label": label, "points": points})
            else:
                bndbox = obj.find("bndbox")
                if bndbox is None:
                    continue
                boxes.append({
                    "label": label,
                    "xmin": int(bndbox.find("xmin").text),
                    "ymin": int(bndbox.find("ymin").text),
                    "xmax": int(bndbox.find("xmax").text),
                    "ymax": int(bndbox.find("ymax").text)
                })

    return JSONResponse(content={"boxes": boxes, "polygons": polygons})
