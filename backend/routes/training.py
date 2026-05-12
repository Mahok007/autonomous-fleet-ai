from fastapi import APIRouter
from backend.ml.train import train_model

router = APIRouter()

@router.get("/train")
def train():
    result = train_model()
    return {"message": result}