from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
import datetime
import secrets
import os

try:
    from backend.mongo_db import users
except ImportError:
    from mongo_db import users

router = APIRouter()

SECRET = "fleetai_secret"
APP_URL = "https://autonomous-fleet-ai-iof5.vercel.app"

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
# EMAIL HELPER
# =========================

def send_reset_email(to_email: str, reset_link: str):
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = os.environ.get("BREVO_API_KEY")

    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )

    email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": to_email}],
        sender={"email": "sarthaksarkar29@gmail.com", "name": "Fleet AI"},
        subject="Reset your Fleet AI password",
        html_content=f"""
        <div style="font-family:sans-serif;max-width:480px;margin:auto;
                    background:#1e293b;padding:32px;border-radius:16px;color:white;">
          <h2 style="color:#627cff;">Fleet AI</h2>
          <h3>Password Reset Request</h3>
          <p style="color:#94a3b8;">Click the button below to set a new password.</p>
          <a href="{reset_link}"
             style="display:inline-block;margin-top:16px;padding:14px 28px;
                    background:#627cff;color:white;border-radius:10px;
                    text-decoration:none;font-weight:bold;">
            Reset My Password
          </a>
          <p style="margin-top:24px;color:#64748b;font-size:12px;">
            If button doesn't work:<br>
            <a href="{reset_link}" style="color:#627cff;">{reset_link}</a>
          </p>
          <p style="color:#64748b;font-size:12px;">
            This link is valid for one use only.
          </p>
        </div>
        """
    )

    api_instance.send_transac_email(email)


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
            "exp":   datetime.datetime.utcnow() + datetime.timedelta(days=1)
        },
        SECRET
    )
    return {
        "access_token": token,
        "username":     user.get("username", "")
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
    reset_link = f"{APP_URL}/reset-password.html?token={token}"
    try:
        send_reset_email(data.email, reset_link)
    except Exception as e:
        print(f"Email error: {e}")
        raise HTTPException(
            status_code=500,
            detail={"message": "Could not send reset email."}
        )
    return {"message": "Reset email sent. Please check your inbox."}


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