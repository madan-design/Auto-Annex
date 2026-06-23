from fastapi import APIRouter, UploadFile, File, Form
import os
import tempfile
import shutil

from app.services.mask_service import MaskService

router = APIRouter()

MASK_OUTPUT_DIR="generated_masks"
SOURCE_OUTPUT_DIR="generated_sources"

os.makedirs(MASK_OUTPUT_DIR,exist_ok=True)
os.makedirs(SOURCE_OUTPUT_DIR,exist_ok=True)


@router.post("/generate_all")
async def generate_all(

 image_files:list[UploadFile]=File(...),
 xml_files:list[UploadFile]=File(...),
 selected_label:str=Form(...)

):

 print("IMAGES RECEIVED:",len(image_files))
 print("XML RECEIVED:",len(xml_files))
 print("SELECTED LABEL:",selected_label)

 with tempfile.TemporaryDirectory() as tmp:

  images_dir=os.path.join(tmp,"images")
  xml_dir=os.path.join(tmp,"xml")

  os.makedirs(images_dir,exist_ok=True)
  os.makedirs(xml_dir,exist_ok=True)

  # SAVE IMAGES
  for img in image_files:

   safe=os.path.basename(img.filename)

   path=os.path.join(images_dir,safe)

   with open(path,"wb") as f:
    shutil.copyfileobj(img.file,f)

  # SAVE XML
  for xml in xml_files:

   safe=os.path.basename(xml.filename)

   path=os.path.join(xml_dir,safe)

   with open(path,"wb") as f:
    shutil.copyfileobj(xml.file,f)

  # GENERATE MASKS
  result=MaskService.generate_all_masks(

   images_dir,
   xml_dir,
   selected_label

  )

  saved_masks=[]

  for m in result["masks"]:

   name=os.path.basename(m)

   shutil.copy(

    m,
    os.path.join(
     MASK_OUTPUT_DIR,
     name
    )

   )

   saved_masks.append(name)

  # ⭐ IMPORTANT FIX
  # clear old sources first
  for f in os.listdir(SOURCE_OUTPUT_DIR):

   try:
    os.remove(
     os.path.join(
      SOURCE_OUTPUT_DIR,
      f
     )
    )
   except:
    pass

  # copy ONLY defect images
  saved_sources=[]

  for m in saved_masks:

   # mask filename: {label}_{image_base}_mask.png
   # strip trailing _mask.png first, then strip the label prefix
   stem = m
   if stem.endswith("_mask.png"):
    stem = stem[:-len("_mask.png")]

   # find the image base by trying each saved XML's label as prefix
   base = stem
   for xml in xml_files:
    lbl = os.path.splitext(os.path.basename(xml.filename))[0]
    # handle label_N.xml -> strip _N suffix for matching
    import re
    lbl_clean = re.sub(r'_\d+$', '', lbl)
    prefix = lbl_clean + "_"
    if stem.startswith(prefix):
     base = stem[len(prefix):]
     break

   for ext in[".jpg",".jpeg",".png"]:

    src=os.path.join(
     images_dir,
     base+ext
    )

    if os.path.exists(src):

     dst=os.path.join(
      SOURCE_OUTPUT_DIR,
      base+ext
     )

     shutil.copy(src,dst)

     saved_sources.append(
      os.path.basename(dst)
     )

     break

  return{

   "success":True,
   "count":len(saved_masks),
   "masks":saved_masks,
   "sources":saved_sources
  }