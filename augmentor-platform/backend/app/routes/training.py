from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.services.yolo_trainer import YOLOTrainer, training_state

router = APIRouter()


# ====================================================
# START YOLO TRAINING
# ====================================================

@router.post("/detection")
async def train_detection(request: Request):
    try:
        payload = await request.json()
        folders    = payload.get("folders", [])
        model_name = payload.get("label", "default")

        if not folders:
            return JSONResponse(status_code=400, content={"error": "No folders selected"})

        trainer = YOLOTrainer(folders, model_name)
        trainer.start()

        return {"success": True, "message": "YOLOv8 Training Started"}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


# ====================================================
# TRAIN STATUS
# ====================================================

@router.get("/status")
def get_training_status():
    return training_state
