from fastapi import APIRouter
from jose import jwt
from datetime import datetime, timedelta

router = APIRouter()

SECRET_KEY = "autonomousfleetai"

USERNAME = "admin"
PASSWORD = "admin123"

# 🚀 LOGIN API
@router.post("/login")
def login(username: str, password: str):

    if username != USERNAME or password != PASSWORD:
        return {"error": "Invalid credentials"}

    expire = datetime.utcnow() + timedelta(hours=2)

    token = jwt.encode(
        {
            "sub": username,
            "exp": expire
        },
        SECRET_KEY,
        algorithm="HS256"
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }