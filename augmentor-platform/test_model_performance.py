import torch
import cv2
import numpy as np

from effdet import create_model


# =============================
# PATHS
# =============================

MODEL_PATH = r"C:\Users\SVJM\Desktop\Madan\alfa-lily\augmentor-platform\backend\models\default_detector.pt"

IMAGE_PATH = r"C:\Users\SVJM\Desktop\Madan\alfa-lily\augmentor-platform\scratch.jpg"

SAVE_PATH = r"C:\Users\SVJM\Desktop\Madan\alfa-lily\augmentor-platform\output_detection.jpg"


# =============================
# SETTINGS
# =============================

MODEL_NAME = "tf_efficientdet_d0"

NUM_CLASSES = 1

INPUT_SIZE = 512

CONF_THRESHOLD = 0.05   # LOWERED FOR DEBUG


CLASS_NAMES = {

    0:"Scratch"

}


# =============================
# DEVICE
# =============================

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print("Using :", device)


# =============================
# LOAD MODEL
# =============================

model = create_model(
    MODEL_NAME,
    bench_task="predict",
    num_classes=NUM_CLASSES,
    pretrained=False
)


print("Loading checkpoint...")

checkpoint = torch.load(
    MODEL_PATH,
    map_location="cpu"
)


# Handle different saving styles

if isinstance(checkpoint, dict):

    if "model" in checkpoint:

        checkpoint = checkpoint["model"]

    elif "state_dict" in checkpoint:

        checkpoint = checkpoint["state_dict"]


model.load_state_dict(checkpoint, strict=False)

model.to(device)

model.eval()

print("Model Loaded ✅")


# =============================
# LOAD IMAGE
# =============================

image = cv2.imread(IMAGE_PATH)

original = image.copy()

h0, w0 = image.shape[:2]


# =============================
# PREPROCESS
# =============================

image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

image = cv2.resize(image,(INPUT_SIZE,INPUT_SIZE))

image = image.astype(np.float32)/255.0


mean=np.array([0.485,0.456,0.406])

std=np.array([0.229,0.224,0.225])

image=(image-mean)/std


image=np.transpose(image,(2,0,1))


tensor=torch.tensor(image).unsqueeze(0).float().to(device)


# =============================
# INFERENCE
# =============================

print("Running Detection...")

with torch.no_grad():

    outputs=model(tensor)[0]


detections=outputs.cpu().numpy()

print("Raw detections:",detections[:10])


# =============================
# DRAW BOXES
# =============================

scale_x=w0/INPUT_SIZE

scale_y=h0/INPUT_SIZE

box_count=0


for det in detections:

    x1,y1,x2,y2,score,cls=det


    print("Score:",score)


    if score < CONF_THRESHOLD:

        continue


    box_count+=1


    x1=int(x1*scale_x)

    y1=int(y1*scale_y)

    x2=int(x2*scale_x)

    y2=int(y2*scale_y)


    label = CLASS_NAMES.get(int(cls),"Scratch")


    cv2.rectangle(

        original,

        (x1,y1),

        (x2,y2),

        (0,255,0),

        3

    )


    cv2.putText(

        original,

        f"{label} {score:.2f}",

        (x1,y1-10),

        cv2.FONT_HERSHEY_SIMPLEX,

        0.8,

        (0,255,0),

        2

    )


print("Boxes Drawn :",box_count)


# =============================
# SAVE
# =============================

cv2.imwrite(SAVE_PATH,original)

print("Saved :",SAVE_PATH)


# =============================
# DISPLAY
# =============================

cv2.imshow("Detection",original)

cv2.waitKey(0)

cv2.destroyAllWindows()