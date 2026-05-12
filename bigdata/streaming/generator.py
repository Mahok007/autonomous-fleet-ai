import random
import time
import csv
import os

# CREATE LOG DIRECTORY IF NOT EXISTS
os.makedirs("bigdata/logs", exist_ok=True)

file_path = "bigdata/logs/fleet_stream.csv"

with open(file_path, "w", newline="") as file:

    writer = csv.writer(file)

    # HEADER
    writer.writerow([
        "speed",
        "distance",
        "weather",
        "action"
    ])

    print("🚀 Big Data Stream Started...")

    while True:

        speed = random.randint(20, 120)

        distance = random.randint(5, 100)

        weather = random.randint(0, 1)

        action = random.randint(0, 1)

        writer.writerow([
            speed,
            distance,
            weather,
            action
        ])

        file.flush()

        print(
            f"Speed={speed}, "
            f"Distance={distance}, "
            f"Weather={weather}, "
            f"Action={action}"
        )

        time.sleep(1)