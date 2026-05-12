from sqlalchemy import Column, Integer, Float
from backend.database import Base

class VehicleData(Base):
    __tablename__ = "vehicle_data"

    id = Column(Integer, primary_key=True, index=True)
    speed = Column(Float)
    distance = Column(Float)
    weather = Column(Integer)
    action = Column(Integer)