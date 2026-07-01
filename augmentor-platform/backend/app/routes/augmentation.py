from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse
import os
import cv2
import tempfile
import shutil
import random
import uuid
from datetime import datetime

from app.services.poisson_blend import PoissonBlender
from app.services.voc_writer import VOCWriter

router = APIRouter()

OUTPUT_DIR = "augmented_output"
MASK_OUTPUT_DIR = "generated_masks"
SOURCE_OUTPUT_DIR = "generated_sources"

os.makedirs(OUTPUT_DIR, exist_ok=True)


# =====================================================
# GET FOLDERS WITH COUNT (UNCHANGED)
# =====================================================

@router.get("/folders")
def get_augmentation_folders():

    try:

        folders_data=[]

        folders=[

            f for f in os.listdir(OUTPUT_DIR)

            if os.path.isdir(
                os.path.join(OUTPUT_DIR,f)
            )

        ]

        folders.sort(reverse=True)

        for folder in folders:

            folder_path=os.path.join(
                OUTPUT_DIR,
                folder,
                "images"
            )

            if not os.path.exists(folder_path):
                continue

            count=len([

                f for f in os.listdir(folder_path)

                if f.lower().endswith(
                    (".jpg",".jpeg",".png")
                )

            ])

            folders_data.append({

                "name":folder,
                "count":count

            })

        return {"folders":folders_data}

    except Exception as e:

        return JSONResponse(
            status_code=500,
            content={"error":str(e)}
        )


# =====================================================
# GET IMAGES (UPDATED FOR images/)
# =====================================================

@router.get("/images/{folder}")
def get_images(folder:str):

    try:

        folder_path=os.path.join(
            OUTPUT_DIR,
            folder,
            "images"
        )

        if not os.path.exists(folder_path):

            return {"images":[]}

        images=[

            f"{folder}/images/{f}"

            for f in os.listdir(folder_path)

            if f.lower().endswith(
                (".jpg",".jpeg",".png")
            )

        ]

        images.sort()

        return {"images":images}

    except Exception as e:

        return JSONResponse(
            status_code=500,
            content={"error":str(e)}
        )


# =====================================================
# DELETE SINGLE FOLDER (UNCHANGED)
# =====================================================

@router.delete("/delete/{folder}")
def delete_folder(folder:str):

    try:

        folder_path=os.path.join(
            OUTPUT_DIR,
            folder
        )

        if os.path.exists(folder_path):

            shutil.rmtree(folder_path)

        return {"success":True}

    except Exception as e:

        return JSONResponse(
            status_code=500,
            content={"error":str(e)}
        )


# =====================================================
# DELETE ALL (UNCHANGED)
# =====================================================

@router.delete("/delete_all")
def delete_all():

    try:

        for f in os.listdir(OUTPUT_DIR):

            path=os.path.join(
                OUTPUT_DIR,
                f
            )

            if os.path.isdir(path):

                shutil.rmtree(path)

        return {"success":True}

    except Exception as e:

        return JSONResponse(
            status_code=500,
            content={"error":str(e)}
        )


# =====================================================
# ⭐ AUGMENTATION WITH AUTO LABEL GENERATION
# =====================================================

@router.post("/dataset")
async def augment_dataset(

    source_image:UploadFile=File(...),
    quantity:int=Form(...),
    selected_label:str=Form(...)

):

    outputs=[]

    if quantity < 500:
        return JSONResponse(
            status_code=400,
            content={"error": "Quantity must be at least 500 for model creation"}
        )

    try:

        timestamp=datetime.now().strftime(
            "%Y-%m-%d_%H-%M-%S"
        )

        run_folder_name=f"{timestamp}_{selected_label}"

        run_dir=os.path.join(
            OUTPUT_DIR,
            run_folder_name
        )

        images_dir=os.path.join(
            run_dir,
            "images"
        )

        labels_dir=os.path.join(
            run_dir,
            "labels"
        )

        os.makedirs(images_dir,exist_ok=True)
        os.makedirs(labels_dir,exist_ok=True)

        with tempfile.TemporaryDirectory() as tmp:

            source_path=os.path.join(tmp,"source.jpg")

            with open(source_path,"wb") as out:

                shutil.copyfileobj(
                    source_image.file,
                    out
                )

            source=cv2.imread(source_path)

            if source is None:

                return JSONResponse(

                    status_code=400,
                    content={
                        "error":"Cannot read source image"
                    }

                )

            h,w=source.shape[:2]

            mask_files=[

                f for f in os.listdir(
                    MASK_OUTPUT_DIR
                )

                if f.startswith(
                    selected_label+"_"
                )

                and f.endswith(".png")

            ]

            if not mask_files:

                return JSONResponse(

                    status_code=400,
                    content={
                        "error":"No masks found"
                    }

                )

            # =======================================
            # GENERATE AUGMENTATIONS
            # =======================================

            for i in range(quantity):

                mf=random.choice(mask_files)

                mask_path=os.path.join(
                    MASK_OUTPUT_DIR,
                    mf
                )

                mask=cv2.imread(mask_path,0)

                if mask is None:
                    continue

                base=mf.replace("_mask.png","")

                # strip label prefix safely (label may contain underscores)
                import re
                lbl_clean = re.sub(r'_\d+$', '', selected_label)
                prefix = lbl_clean + "_"
                if base.startswith(prefix):
                    base = base[len(prefix):]

                damage_img=None

                for ext in [".jpg",".jpeg",".png"]:

                    candidate=os.path.join(

                        SOURCE_OUTPUT_DIR,
                        base+ext

                    )

                    if os.path.exists(candidate):

                        damage_img=cv2.imread(candidate)
                        break

                if damage_img is None:
                    continue

                target=source.copy()

                # ⭐ NEW RETURNS bbox
                out_img,bbox = PoissonBlender.blend(

                    damage_img,
                    target,
                    mask

                )

                if bbox is None:
                    continue

                unique_name=f"aug_{uuid.uuid4().hex}.jpg"

                image_path=os.path.join(

                    images_dir,
                    unique_name

                )

                cv2.imwrite(
                    image_path,
                    out_img
                )

                # ===================================
                # ⭐ CREATE VOC XML
                # ===================================

                xml_name=unique_name.replace(".jpg",".xml")

                xml_path=os.path.join(
                    labels_dir,
                    xml_name
                )

                VOCWriter.save_xml(

                    xml_path,
                    unique_name,
                    w,
                    h,
                    selected_label,
                    bbox

                )

                outputs.append(

                    f"{run_folder_name}/images/{unique_name}"

                )

        return {

            "success":True,
            "count":len(outputs),
            "augmented":outputs

        }

    except Exception as e:

        return JSONResponse(
            status_code=500,
            content={"error":str(e)}
        )