from fastapi import Depends, HTTPException
import os

def validate_path(path: str):
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Path does not exist")
    return path