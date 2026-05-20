
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt
 
import datetime
import secrets
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
 
# Fixed import — works whether you run as 'backend.main' or with --app-dir backend
try:
    from backend.mongo_db import users
except ImportError:
    from mongo_db import users
 
 
router = APIRouter()
 
SECRET    = "fleetai_secret"
MAIL_USER = os.environ.get("MAIL_USER")
MAIL_PASS = os.environ.get("MAIL_PASS")
APP_URL   = "https://autonomous-fleet-ai-1.onrender.com"
 
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
 
    subject = "Reset your Fleet AI password"
 
    text_body = f"""
Hi,
 
You requested a password reset for your Fleet AI account.
 
Click the link below to set a new password:
{reset_link}
 
This link is valid for one use only.
If you did not request this, ignore this email.
 
– Fleet AI Team
"""
 
    html_body = f"""
<div style="font-family:sans-serif;max-width:480px;margin:auto;
            background:#1e293b;padding:32px;border-radius:16px;color:white;">
  <h2 style="color:#627cff;">Fleet AI</h2>
  <h3>Password Reset Request</h3>
  <p style="color:#94a3b8;">
    Click the button below to set a new password for your account.
  </p>
  <a href="{reset_link}"
     style="display:inline-block;margin-top:16px;padding:14px 28px;
            background:#627cff;color:white;border-radius:10px;
            text-decoration:none;font-weight:bold;">
    Reset My Password
  </a>
  <p style="margin-top:24px;color:#64748b;font-size:12px;">
    If the button does not work, paste this link into your browser:<br>
    <a href="{reset_link}" style="color:#627cff;">{reset_link}</a>
  </p>
  <p style="color:#64748b;font-size:12px;">
    This link is valid for one use only.
    If you did not request this, ignore this email.
  </p>
</div>
"""
 
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = MAIL_USER
    msg["To"]      = to_email
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))
 
    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.ehlo()
        server.starttls()
        server.login(MAIL_USER, MAIL_PASS)
        server.sendmail(MAIL_USER, to_email, msg.as_string())
 
 
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
            detail={"message": "Could not send reset email. Check MAIL_USER and MAIL_PASS in Render environment variables."}
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
 