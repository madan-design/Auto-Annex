import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATASET_DIR = os.path.join(BASE_DIR, "datasets")
MODEL_DIR = os.path.join(BASE_DIR, "models")
AUGMENTED_DIR = os.path.join(BASE_DIR, "augmented")

os.makedirs(DATASET_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(AUGMENTED_DIR, exist_ok=True)