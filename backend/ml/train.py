import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from backend.ml.model import save_model
from backend.database import SessionLocal
from backend.models import VehicleData

def train_model():
    db = SessionLocal()
    data = db.query(VehicleData).all()
    db.close()

    if len(data) == 0:
        return "No data available"

    df = pd.DataFrame([{
        "speed": d.speed,
        "distance": d.distance,
        "weather": d.weather,
        "action": d.action
    } for d in data])

    X = df[["speed", "distance", "weather"]]
    y = df["action"]

    model = RandomForestClassifier()
    model.fit(X, y)

    save_model(model)

    return "Model trained using database data"