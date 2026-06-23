import os
import shutil
from uuid import uuid4

class FileManager:

    @staticmethod
    def save_upload(file, directory: str):
        os.makedirs(directory, exist_ok=True)
        filename = f"{uuid4()}_{file.filename}"
        path = os.path.join(directory, filename)

        with open(path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return path

    @staticmethod
    def list_images(directory: str):
        return [
            f for f in os.listdir(directory)
            if f.lower().endswith((".jpg", ".jpeg", ".png"))
        ]

    @staticmethod
    def ensure_dir(path: str):
        os.makedirs(path, exist_ok=True) 