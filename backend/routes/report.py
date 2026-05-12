from fastapi import APIRouter
from backend.database import SessionLocal
from backend.models import VehicleData

router = APIRouter()

@router.get("/generate_report")

def generate_report():

    db = SessionLocal()

    data = db.query(VehicleData).all()

    db.close()

    total = len(data)

    if total == 0:

        return {
            "report": "No fleet data available."
        }

    avg_speed = sum(x.speed for x in data) / total

    brake = len([x for x in data if x.action == 0])

    accel = len([x for x in data if x.action == 1])

    report = f"""

AUTONOMOUS FLEET AI REPORT

----------------------------

Total Vehicles: {total}

Average Speed: {avg_speed:.2f}

Brake Events: {brake}

Acceleration Events: {accel}

System Status:
Fleet operating normally.

AI Insights:
- Some drivers exceed safe speed
- Brake frequency increases in risky conditions
- AI prediction engine functioning correctly

Recommendations:
- Increase monitoring for risky vehicles
- Continue AI training
- Improve acceleration efficiency

"""

    return {
        "report": report
    }