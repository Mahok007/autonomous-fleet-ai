from fastapi import APIRouter
from pydantic import BaseModel
import jwt
import datetime
import cv2
import numpy as np

router = APIRouter()

SECRET_KEY = "fleetai_secret_key"

# =========================
# LOGIN MODEL
# =========================

class LoginData(BaseModel):

    username:str
    password:str


# =========================
# LOGIN API
# =========================

@router.post("/login")
def login(data:LoginData):

    if(
        data.username=="admin"
        and
        data.password=="admin123"
    ):

        token=jwt.encode({

            "user":data.username,

            "exp":
            datetime.datetime.utcnow()
            +
            datetime.timedelta(hours=5)

        },

        SECRET_KEY,

        algorithm="HS256")

        return{

            "access_token":token

        }

    return{

        "message":
        "Invalid Username or Password"

    }


# =========================
# LANE DETECTION API
# =========================

@router.post("/detect_lane")
async def detect_lane():

    return{

        "lane":
        "Detected"

    }


# =========================
# ROAD SEGMENT API
# =========================

@router.post("/road_segment")
async def road_segment():

    return{

        "road":
        "Detected"

    }