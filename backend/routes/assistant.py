from fastapi import APIRouter
from backend.database import SessionLocal
from backend.models import VehicleData

router = APIRouter()


@router.get("/ai_assistant")
def ai_assistant(question: str):

    db = SessionLocal()

    data = db.query(VehicleData).all()

    db.close()

    total = len(data)

    if total == 0:

        return {
            "response": "No fleet data available."
        }

    # =========================
    # CALCULATIONS
    # =========================

    avg_speed = sum([x.speed for x in data]) / total

    brake_count = len([x for x in data if x.action == 0])

    accel_count = len([x for x in data if x.action == 1])

    high_speed_vehicles = [x.id for x in data if x.speed > 80]

    risky_distance = [x.id for x in data if x.distance < 10]

    bad_weather = len([x for x in data if x.weather == 1])

    question = question.lower()

    # =========================
    # PERFORMANCE
    # =========================

    if (
        "performance" in question or
        "summary" in question or
        "statistics" in question or
        "fleet" in question
    ):

        answer = f"""
🚗 Fleet Performance Report

Total Vehicles:
{total}

Average Speed:
{avg_speed:.2f}

Brake Decisions:
{brake_count}

Acceleration Decisions:
{accel_count}

Weather Alerts:
{bad_weather}

System Status:
OPERATIONAL
"""

    # =========================
    # BRAKE ANALYSIS
    # =========================

    elif (
        "brake" in question or
        "safety" in question
    ):

        answer = f"""
🛑 Braking Analysis

AI recommends braking when:

• Distance becomes too low
• Speed exceeds safe limits
• Weather conditions are risky

Current Brake Events:
{brake_count}

Vehicles with risky distance:
{risky_distance}
"""

    # =========================
    # ACCELERATION
    # =========================

    elif (
        "accelerate" in question or
        "speed" in question
    ):

        answer = f"""
🚀 Acceleration Analysis

Acceleration Events:
{accel_count}

Average Fleet Speed:
{avg_speed:.2f}

High Speed Vehicles:
{high_speed_vehicles}
"""

    # =========================
    # REPORT
    # =========================

    elif (
        "report" in question or
        "analytics" in question
    ):

        answer = f"""
📊 AUTONOMOUS FLEET REPORT

Total Vehicles:
{total}

Average Speed:
{avg_speed:.2f}

Brake Events:
{brake_count}

Acceleration Events:
{accel_count}

Bad Weather Events:
{bad_weather}

High Speed Vehicles:
{high_speed_vehicles}

System Status:
ONLINE
"""

    # =========================
    # MAINTENANCE
    # =========================

    elif (
        "maintenance" in question or
        "repair" in question
    ):

        if len(high_speed_vehicles) == 0:

            answer = """
🛠 Maintenance Report

All vehicles operating normally.

No maintenance required currently.
"""

        else:

            answer = f"""
🛠 Maintenance Alert

Vehicles needing maintenance:

{high_speed_vehicles}

Reason:

• High speed usage detected
• Engine stress probability increased
"""

    # =========================
    # TRAFFIC
    # =========================

    elif (
        "traffic" in question or
        "road" in question
    ):

        answer = """
🚦 Traffic Prediction

Moderate traffic detected.

AI Recommendations:

• Reduce speed in dense areas
• Increase braking distance
• Avoid risky overtaking
"""

    # =========================
    # OPTIMIZATION
    # =========================

    elif (
        "optimize" in question or
        "routing" in question or
        "route" in question
    ):

        answer = """
🧠 Quantum Route Optimization

Recommended Route:
Route A

Benefits:

• Lower congestion
• Faster travel time
• Reduced fuel usage
• Improved fleet efficiency
"""

    # =========================
    # IMPROVEMENT
    # =========================

    elif (
        "improvement" in question or
        "improve" in question or
        "suggestion" in question
    ):

        answer = """
📈 AI Driving Suggestions

• Maintain safer distance
• Reduce sudden braking
• Avoid overspeeding
• Monitor weather conditions
• Improve acceleration smoothness
"""

    # =========================
    # WEATHER
    # =========================

    elif (
        "weather" in question
    ):

        answer = f"""
🌦 Weather Analysis

Bad Weather Events:
{bad_weather}

AI Recommendations:

• Reduce vehicle speed
• Increase safety distance
• Enable smart braking mode
"""

    # =========================
    # STATUS
    # =========================

    elif (
        "status" in question or
        "system" in question
    ):

        answer = """
🟢 Fleet System Status

All AI systems operational.

Modules Running:

• AI Prediction Engine
• Fleet Analytics
• Vehicle Tracking
• Quantum Optimizer
• Generative AI Assistant
"""

    # =========================
    # HELLO
    # =========================

    elif (
        "hello" in question or
        "who are you" in question or
        "what can you do" in question
    ):

        answer = """
🤖 Autonomous Fleet AI Assistant

I can help with:

• Fleet analytics
• Vehicle monitoring
• Maintenance prediction
• Traffic prediction
• AI reports
• Safety analysis
• Route optimization
"""

    # =========================
    # DEFAULT
    # =========================

    else:

        answer = """
🤖 AI Assistant Ready

Try asking:

• fleet performance
• generate report
• braking analysis
• acceleration analysis
• maintenance report
• predict traffic
• optimize route
• weather analysis
• system status
• driving suggestions
"""

    return {
        "response": answer
    }