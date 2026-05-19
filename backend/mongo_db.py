from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL="mongodb+srv://makokthekingsarthak_db_user:borjXqBOT4vTJ4WU@cluster0.nuxrzde.mongodb.net/?appName=Cluster0"

client=AsyncIOMotorClient(
    MONGO_URL
)

db=client["fleet_ai"]

users=db["users"]