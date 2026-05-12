from fastapi import APIRouter
import random

router = APIRouter()

@router.get("/simulate")
def simulate():
    return {
        "speed": random.randint(20, 100),
        "distance": random.randint(1, 20),
        "weather": random.randint(0, 1)
    }