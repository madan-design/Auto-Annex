import os
import uuid
import shutil

import cv2
from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse

router = APIRouter()

MODELS_DIR  = "models"
RESULT_DIR  = "detect_results"

os.makedirs(RESULT_DIR, exist_ok=True)


# ─────────────────────────────────────────────────────
# LIST AVAILABLE .pt MODELS
# ─────────────────────────────────────────────────────

@router.get("/models")
def list_models():
    if not os.path.exists(MODELS_DIR):
        return {"models": []}
    models = sorted(
        f for f in os.listdir(MODELS_DIR)
        if f.endswith(".pt") and os.path.isfile(os.path.join(MODELS_DIR, f))
    )
    return {"models": models}


# ─────────────────────────────────────────────────────
# RUN DETECTION ON IMAGE
# ─────────────────────────────────────────────────────

@router.post("/run")
async def run_detection(
    model_name: str  = Form(...),
    file:        UploadFile = File(...),
    confidence:  float      = Form(0.4),
):
    ext      = os.path.splitext(file.filename)[-1].lower()
    tmp_path = f"temp_{uuid.uuid4().hex}{ext}"

    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    model_path = os.path.join(MODELS_DIR, model_name)
    if not os.path.exists(model_path):
        os.remove(tmp_path)
        return JSONResponse(status_code=404, content={"error": "Model not found"})

    try:
        from ultralytics import YOLO
        model   = YOLO(model_path)
        results = model.predict(source=tmp_path, conf=confidence, verbose=False)

        result_name = f"result_{uuid.uuid4().hex}.jpg"
        result_path = os.path.join(RESULT_DIR, result_name)

        # Save annotated frame
        annotated = results[0].plot()
        cv2.imwrite(result_path, annotated)

        # Build detection list
        detections = []
        for box in results[0].boxes:
            cls_id = int(box.cls[0])
            label  = model.names[cls_id]
            score  = float(box.conf[0])
            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
            detections.append({"label": label, "score": round(score, 3),
                                "box": [x1, y1, x2, y2]})

        return {
            "result_image": f"/detect/result/{result_name}",
            "detections":   detections,
            "count":        len(detections),
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


# ─────────────────────────────────────────────────────
# RUN DETECTION ON VIDEO
# ─────────────────────────────────────────────────────

@router.post("/run_video")
async def run_video_detection(
    model_name: str  = Form(...),
    file:        UploadFile = File(...),
    confidence:  float      = Form(0.4),
):
    ext      = os.path.splitext(file.filename)[-1].lower()
    tmp_path = f"temp_{uuid.uuid4().hex}{ext}"

    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    model_path = os.path.join(MODELS_DIR, model_name)
    if not os.path.exists(model_path):
        os.remove(tmp_path)
        return JSONResponse(status_code=404, content={"error": "Model not found"})

    result_name = f"result_{uuid.uuid4().hex}.mp4"
    result_path = os.path.join(RESULT_DIR, result_name)

    try:
        from ultralytics import YOLO
        model = YOLO(model_path)

        cap    = cv2.VideoCapture(tmp_path)
        fps    = cap.get(cv2.CAP_PROP_FPS) or 25
        width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        writer = cv2.VideoWriter(
            result_path,
            cv2.VideoWriter_fourcc(*"mp4v"),
            fps,
            (width, height),
        )

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            res = model.predict(source=frame, conf=confidence, verbose=False)
            writer.write(res[0].plot())

        cap.release()
        writer.release()

        return {"result_video": f"/detect/result/{result_name}"}

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


# Static files are mounted on the main app in main.py
