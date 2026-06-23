from fastapi import APIRouter
import os
import xml.etree.ElementTree as ET

router = APIRouter()

# =====================================================
# CONFIG
# =====================================================

DATASET_FOLDER = "datasets"


# =====================================================
# CREATE DATASET FOLDER IF NOT EXISTS
# =====================================================

os.makedirs(DATASET_FOLDER, exist_ok=True)


# =====================================================
# CLEAR OLD XML ANNOTATIONS FUNCTION
# =====================================================

def clear_old_annotations():

    deleted_files = []

    for file in os.listdir(DATASET_FOLDER):

        # Delete only annotation XML files
        if file.lower().endswith(".xml"):

            file_path = os.path.join(DATASET_FOLDER, file)

            try:
                os.remove(file_path)

                deleted_files.append(file)

                print(f"[CLEARED] {file_path}")

            except Exception as e:

                print(f"[ERROR] Cannot delete {file_path} : {e}")

    return deleted_files


# =====================================================
# CLEAR ANNOTATIONS ENDPOINT
# =====================================================

@router.post("/clear_annotations")
def clear_annotations():

    deleted = clear_old_annotations()

    return {
        "message": "Previous annotations cleared successfully",
        "deleted_files": deleted,
        "total_deleted": len(deleted)
    }


# =====================================================
# FETCH UNIQUE LABELS FROM XML FILES
# =====================================================

@router.get("/labels")
def labels():

    labels = set()

    for f in os.listdir(DATASET_FOLDER):

        if not f.lower().endswith(".xml"):
            continue

        xml_path = os.path.join(DATASET_FOLDER, f)

        try:
            root = ET.parse(xml_path).getroot()

            for obj in root.findall("object"):

                name_tag = obj.find("name")

                if name_tag is not None:
                    labels.add(name_tag.text)

        except Exception as e:

            print(f"[XML ERROR] {xml_path} -> {e}")

    return {
        "labels": sorted(list(labels))
    }