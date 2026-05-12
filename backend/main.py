from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ROUTES
from backend.routes import vehicle
from backend.routes import training
from backend.routes import simulation
from backend.routes import assistant
from backend.routes import analytics
from backend.routes import report
from backend.routes import predict

# AUTH
from backend.auth import auth

# DATABASE
from backend.database import engine, Base

# FASTAPI APP
app = FastAPI()

# CREATE DATABASE TABLES
Base.metadata.create_all(bind=engine)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# ROUTERS
# =========================

app.include_router(vehicle.router)

app.include_router(training.router)

app.include_router(simulation.router)

app.include_router(auth.router)

app.include_router(assistant.router)

app.include_router(analytics.router)

app.include_router(report.router)

app.include_router(predict.router)

# =========================
# HOME API
# =========================

@app.get("/")
def root():

    return {
        "message": "🚗 Autonomous Fleet AI Platform Running Successfully"
    }