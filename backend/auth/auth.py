from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# =========================
# LOGIN MODEL
# =========================

class LoginData(BaseModel):
    username: str
    password: str

# =========================
# LOGIN API
# =========================

@router.post("/login")
def login(data: LoginData):

    # DEMO LOGIN

    if data.username == "admin" and data.password == "admin123":

        return {
            "access_token": "fleet_ai_token",
            "token_type": "bearer"
        }

    return {
        "error": "Invalid username or password"
    }