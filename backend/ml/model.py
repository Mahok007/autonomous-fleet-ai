import pickle

def load_model():
    try:
        with open("backend/ml/model.pkl", "rb") as f:
            return pickle.load(f)
    except:
        return None

def save_model(model):
    with open("backend/ml/model.pkl", "wb") as f:
        pickle.dump(model, f)
def predict_action(speed, distance, weather):
    model = load_model()

    if model is None:
        return {"error": "Model not trained yet"}

    probs = model.predict_proba([[speed, distance, weather]])[0]

    return {
        "brake_prob": round(probs[0] * 100, 2),
        "accelerate_prob": round(probs[1] * 100, 2)
    }

from pydantic import BaseModel, EmailStr


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