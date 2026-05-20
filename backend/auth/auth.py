
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from mongo_db import users
 
from passlib.context import CryptContext
from jose import jwt
 
import datetime
import secrets
 
 
router = APIRouter()
 
SECRET = "fleetai_secret"
 
pwd = CryptContext(schemes=["bcrypt"])
 
 
# =========================
# MODELS
# =========================
 
class RegisterUser(BaseModel):
    username: str
    email: EmailStr
    password: str
 
 
class LoginUser(BaseModel):
    email: EmailStr
    password: str
 
 
class ForgotPassword(BaseModel):
    email: EmailStr
 
 
class ResetPassword(BaseModel):
    password: str
 
 
# =========================
# REGISTER
# =========================
 
@router.post("/register")
async def register(data: RegisterUser):
 
    existing = await users.find_one({"email": data.email})
 
    if existing:
        raise HTTPException(
            status_code=400,
            detail={"message": "User already exists"}
        )
 
    hashed = pwd.hash(data.password)
 
    await users.insert_one({
        "username": data.username,
        "email":    data.email,
        "password": hashed,
        "reset":    None
    })
 
    return {"message": "Registered Successfully"}
 
 
# =========================
# LOGIN
# =========================
 
@router.post("/login")
async def login(data: LoginUser):
 
    user = await users.find_one({"email": data.email})
 
    if not user:
        raise HTTPException(
            status_code=401,
            detail={"message": "User not found"}
        )
 
    valid = pwd.verify(data.password, user["password"])
 
    if not valid:
        raise HTTPException(
            status_code=401,
            detail={"message": "Wrong password"}
        )
 
    token = jwt.encode(
        {
            "email": user["email"],
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
        },
        SECRET
    )
 
    return {
        "access_token": token,
        "username": user.get("username", "")
    }
 
 
# =========================
# FORGOT PASSWORD
# =========================
 
@router.post("/forgot")
async def forgot(data: ForgotPassword):
 
    user = await users.find_one({"email": data.email})
 
    if not user:
        raise HTTPException(
            status_code=404,
            detail={"message": "Email not found"}
        )
 
    token = secrets.token_hex(32)
 
    await users.update_one(
        {"email": data.email},
        {"$set": {"reset": token}}
    )
 
    # -------------------------------------------------------
    # TODO: Replace this block with real email sending.
    # Example using SendGrid or SMTP (smtplib / fastapi-mail).
    # For now, the reset token is returned so you can build
    # the reset link yourself:  /reset-password.html?token=TOKEN
    # -------------------------------------------------------
 
    reset_link = f"https://autonomous-fleet-ai-1.onrender.com/reset-password?token={token}"
 
    # If you add email sending, send reset_link to data.email here.
    # Example (pseudocode):
    #   send_email(to=data.email, subject="Reset your password", body=f"Click: {reset_link}")
 
    return {
        "message": "Reset link generated. Check your email.",
        "reset_link": reset_link      # Remove this line once real email is wired up
    }
 
 
# =========================
# RESET PASSWORD
# =========================
 
@router.post("/reset/{token}")
async def reset(token: str, data: ResetPassword):
 
    user = await users.find_one({"reset": token})
 
    if not user:
        raise HTTPException(
            status_code=400,
            detail={"message": "Invalid or expired token"}
        )
 
    hashed = pwd.hash(data.password)
 
    await users.update_one(
        {"reset": token},
        {"$set": {"password": hashed, "reset": None}}
    )
 
    return {"message": "Password updated successfully"}