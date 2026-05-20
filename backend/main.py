from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.auth import router as auth_router
from backend.routes.vehicle import router as vehicle_router
from backend.routes.analytics import router as analytics_router
from backend.routes.predict import router as predict_router
from backend.routes.report import router as report_router
from backend.routes.simulation import router as simulation_router
from backend.routes.training import router as training_router
from backend.routes.ai_assistant import router as ai_router
from backend.database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router,        prefix="/auth")
app.include_router(vehicle_router)
app.include_router(analytics_router)
app.include_router(predict_router)
app.include_router(report_router)
app.include_router(simulation_router)
app.include_router(training_router)
app.include_router(ai_router)

@app.get("/")
def root():
    return {"message": "Fleet AI Backend Running"}