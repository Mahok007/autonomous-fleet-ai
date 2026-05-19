from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
from mongo_db import users

from passlib.context import CryptContext
from jose import jwt

import datetime
import secrets
import cv2
import numpy as np


router = APIRouter()

SECRET="fleetai_secret"

pwd = CryptContext(
    schemes=["bcrypt"]
)


# =========================
# MODELS
# =========================

class RegisterUser(BaseModel):
    username:str
    email:EmailStr
    password:str


class LoginUser(BaseModel):
    email:EmailStr
    password:str


class ForgotPassword(BaseModel):
    email:EmailStr


class ResetPassword(BaseModel):
    password:str


# =========================
# REGISTER
# =========================

@router.post("/register")
async def register(data:RegisterUser):

    existing = await users.find_one(
        {"email":data.email}
    )

    if existing:

        return{
            "message":
            "User already exists"
        }

    hashed = pwd.hash(
        data.password
    )

    await users.insert_one({

        "username":
        data.username,

        "email":
        data.email,

        "password":
        hashed

    })

    return{
        "message":
        "Registered Successfully"
    }


# =========================
# LOGIN
# =========================

@router.post("/login")
async def login(data:LoginUser):

    user=await users.find_one({

        "email":
        data.email

    })

    if not user:

        return{
            "message":
            "User not found"
        }


    valid=pwd.verify(

        data.password,

        user["password"]

    )


    if not valid:

        return{
            "message":
            "Wrong Password"
        }


    token=jwt.encode(

        {

        "email":
        user["email"],

        "exp":

        datetime.datetime.utcnow()

        +

        datetime.timedelta(days=1)

        },

        SECRET

    )


    return{

        "access_token":
        token

    }


# =========================
# FORGOT PASSWORD
# =========================

@router.post("/forgot")
async def forgot(
data:ForgotPassword
):

    user=

    await users.find_one({

        "email":
        data.email

    })


    if not user:

        return{

            "message":
            "Email not found"

        }


    token=

    secrets.token_hex(
        32
    )


    await users.update_one(

        {

        "email":
        data.email

        },

        {

        "$set":{

            "reset":
            token

            }

        }

    )


    return{

        "resetToken":
        token

    }


# =========================
# RESET PASSWORD
# =========================

@router.post("/reset/{token}")

async def reset(

token:str,

data:ResetPassword

):

    user=

    await users.find_one({

        "reset":
        token

    })


    if not user:

        return{

            "message":
            "Invalid Token"

        }


    hashed=

    pwd.hash(
        data.password
    )


    await users.update_one(

        {

        "reset":
        token

        },

        {

        "$set":{

            "password":
            hashed

            }

        }

    )


    return{

        "message":
        "Password Updated"

    }


# =========================
# LANE API
# =========================

@router.post("/detect_lane")

async def detect_lane():

    return{

        "lane":
        "Detected"

    }


# =========================
# ROAD API
# =========================

@router.post("/road_segment")

async def road_segment():

    return{

        "road":
        "Detected"

    }