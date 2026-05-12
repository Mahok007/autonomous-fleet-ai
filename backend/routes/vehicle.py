from fastapi import APIRouter
from backend.database import SessionLocal
from backend.models import VehicleData

import random

router = APIRouter()

# STORE DATA
@router.post("/add_data")
def add_data(
    speed: float,
    distance: float,
    weather: int,
    action: int
):

    db = SessionLocal()

    vehicle = VehicleData(
        speed=speed,
        distance=distance,
        weather=weather,
        action=action
    )

    db.add(vehicle)

    db.commit()

    db.refresh(vehicle)

    db.close()

    return {
        "message": "Data stored successfully"
    }

# GET ALL DATA
@router.get("/data")
def get_data():

    db = SessionLocal()

    data = db.query(VehicleData).all()

    db.close()

    return data

# DELETE DATA
@router.delete("/delete/{id}")
def delete_data(id: int):

    db = SessionLocal()

    vehicle = db.query(VehicleData).filter(
        VehicleData.id == id
    ).first()

    if vehicle:

        db.delete(vehicle)

        db.commit()

    db.close()

    return {
        "message": "Deleted successfully"
    }

# AI PREDICTION
@router.get("/predict")
def predict(
    speed: float,
    distance: float,
    weather: int
):

    # SIMPLE AI LOGIC

    if speed > 80 or distance < 15:
        brake = random.randint(70, 95)
        accel = 100 - brake
    else:
        accel = random.randint(70, 95)
        brake = 100 - accel

    return {
        "brake_prob": brake,
        "accelerate_prob": accel
    }