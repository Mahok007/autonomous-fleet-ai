from fastapi import APIRouter
from backend.ml.model import predict_action

router = APIRouter()

@router.get("/predict")
def predict(speed: float, distance: float, weather: int):
    result = predict_action(speed, distance, weather)
    return result