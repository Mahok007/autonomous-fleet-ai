from fastapi import APIRouter
from backend.database import SessionLocal
from backend.models import VehicleData

router = APIRouter()

@router.get("/analytics")

def analytics():

    db = SessionLocal()

    data = db.query(VehicleData).all()

    db.close()

    total = len(data)

    if total == 0:

        return {
            "message": "No data"
        }

    avg_speed = sum(x.speed for x in data) / total

    avg_distance = sum(x.distance for x in data) / total

    brake = len([x for x in data if x.action == 0])

    accel = len([x for x in data if x.action == 1])

    risky = len([x for x in data if x.speed > 80])

    return {

        "total_vehicles": total,

        "average_speed": avg_speed,

        "average_distance": avg_distance,

        "brake_events": brake,

        "acceleration_events": accel,

        "risky_drivers": risky
    }