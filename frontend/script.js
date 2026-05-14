let chart;
let liveChart;
let analyticsChart;
let decisionChart;

let labels = [];
let brakeData = [];
let accelData = [];

let map;
let routingControl;
let vehicleMarker;

let tripData = [];

let watchId = null;
let tripStarted = false;

let previousLat = null;
let previousLng = null;
let previousTime = null;
let previousSpeed = 0;

let trafficInterval = null;

let totalBrakeEvents = 0;
let totalAccelEvents = 0;

// =========================
// TRAIN MODEL
// =========================

function trainModel() {

    fetch("https://autonomous-fleet-ai-1.onrender.com/train")

    .then(res => res.json())

    .then(data => {

        alert(data.message);

    });
}

// =========================
// PREDICT
// =========================

function predict() {

    let speed =
        document.getElementById("speed").value;

    let distance =
        document.getElementById("distance").value;

    let weather =
        document.getElementById("weather").value;

    fetch(
        `https://autonomous-fleet-ai-1.onrender.com/predict?speed=${speed}&distance=${distance}&weather=${weather}`
    )

    .then(res => res.json())

    .then(data => {

        let brake = data.brake_prob;
        let accel = data.accelerate_prob;

        document.getElementById("result").innerText =
            `Brake: ${brake}% | Accelerate: ${accel}%`;

        drawChart(brake, accel);

        updateLiveChart(brake, accel);

        moveCars(accel);

    });
}

// =========================
// BAR CHART
// =========================

function drawChart(brake, accel) {

    const ctx =
        document.getElementById("chart").getContext("2d");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {

        type: "bar",

        data: {

            labels: ["Brake", "Accelerate"],

            datasets: [{

                label: "Decision Confidence (%)",

                data: [brake, accel],

                backgroundColor: [
                    "#ef4444",
                    "#22c55e"
                ]

            }]
        },

        options: {

            responsive: true,

            scales: {

                y: {

                    beginAtZero: true,
                    max: 100

                }
            }
        }
    });
}

// =========================
// LIVE CHART
// =========================

function updateLiveChart(brake, accel) {

    const ctx =
        document.getElementById("liveChart").getContext("2d");

    if (!liveChart) {

        liveChart = new Chart(ctx, {

            type: "line",

            data: {

                labels: labels,

                datasets: [

                    {
                        label: "Brake",

                        data: brakeData,

                        borderColor: "#ef4444",

                        fill: false
                    },

                    {
                        label: "Accelerate",

                        data: accelData,

                        borderColor: "#22c55e",

                        fill: false
                    }
                ]
            },

            options: {

                responsive: true,

                animation: false
            }
        });
    }

    let time =
        new Date().toLocaleTimeString();

    labels.push(time);

    brakeData.push(brake);

    accelData.push(accel);

    if (labels.length > 15) {

        labels.shift();
        brakeData.shift();
        accelData.shift();
    }

    liveChart.update();
}

// =========================
// CAR MOVEMENT
// =========================

function moveCars(accel) {

    let cars = [
        document.getElementById("car1"),
        document.getElementById("car2"),
        document.getElementById("car3")
    ];

    cars.forEach((car, index) => {

        let position =
            parseInt(car.style.left) || 0;

        if (accel > 50) {

            position += 20 + (index * 10);

        } else {

            position -= 10;
        }

        if (position > 900)
            position = 0;

        if (position < 0)
            position = 0;

        car.style.left = position + "px";
    });

    let redLight =
        document.getElementById("redLight");

    let yellowLight =
        document.getElementById("yellowLight");

    let greenLight =
        document.getElementById("greenLight");

    let fleetStatus =
        document.getElementById("fleetStatus");

    if (accel > 50) {

        greenLight.style.opacity = 1;
        yellowLight.style.opacity = 0.3;
        redLight.style.opacity = 0.3;

        fleetStatus.innerText =
            "Vehicles accelerating smoothly";

    } else {

        redLight.style.opacity = 1;
        yellowLight.style.opacity = 0.3;
        greenLight.style.opacity = 0.3;

        fleetStatus.innerText =
            "AI applied braking system";
    }
}

// =========================
// MAP INITIALIZATION
// =========================

window.onload = function () {

    map =
        L.map("map").setView([20.5937, 78.9629], 5);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "© OpenStreetMap"
        }
    ).addTo(map);

    let blueIcon = L.icon({

        iconUrl:
            "https://cdn-icons-png.flaticon.com/512/684/684908.png",

        iconSize: [35, 35],

        iconAnchor: [17, 35]
    });

    vehicleMarker =
        L.marker(
            [20.5937, 78.9629],
            { icon: blueIcon }
        ).addTo(map);

    if (navigator.geolocation) {

        navigator.geolocation.getCurrentPosition(

            function(position) {

                let lat =
                    position.coords.latitude;

                let lng =
                    position.coords.longitude;

                map.setView([lat, lng], 13);

                vehicleMarker.setLatLng([lat, lng]);

                getTrafficData(lat, lng);

            },

            function(error) {

                console.log(error);

            }

        );
    }

    loadData();
};

let chart;
let liveChart;
let analyticsChart;
let decisionChart;

let labels = [];
let brakeData = [];
let accelData = [];

let map;
let routingControl;
let vehicleMarker;

let tripData = [];

let watchId = null;
let tripStarted = false;

let previousLat = null;
let previousLng = null;
let previousTime = null;
let previousSpeed = 0;

let trafficInterval = null;

let totalBrakeEvents = 0;
let totalAccelEvents = 0;

// =========================
// TRAIN MODEL
// =========================

function trainModel() {

    fetch("https://autonomous-fleet-ai-1.onrender.com/train")

    .then(res => res.json())

    .then(data => {

        alert(data.message);

    });
}

// =========================
// PREDICT
// =========================

function predict() {

    let speed =
        document.getElementById("speed").value;

    let distance =
        document.getElementById("distance").value;

    let weather =
        document.getElementById("weather").value;

    fetch(
        `https://autonomous-fleet-ai-1.onrender.com/predict?speed=${speed}&distance=${distance}&weather=${weather}`
    )

    .then(res => res.json())

    .then(data => {

        let brake = data.brake_prob;
        let accel = data.accelerate_prob;

        document.getElementById("result").innerText =
            `Brake: ${brake}% | Accelerate: ${accel}%`;

        drawChart(brake, accel);

        updateLiveChart(brake, accel);

        moveCars(accel);

    });
}

// =========================
// BAR CHART
// =========================

function drawChart(brake, accel) {

    const ctx =
        document.getElementById("chart").getContext("2d");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {

        type: "bar",

        data: {

            labels: ["Brake", "Accelerate"],

            datasets: [{

                label: "Decision Confidence (%)",

                data: [brake, accel],

                backgroundColor: [
                    "#ef4444",
                    "#22c55e"
                ]

            }]
        },

        options: {

            responsive: true,

            scales: {

                y: {

                    beginAtZero: true,
                    max: 100

                }
            }
        }
    });
}

// =========================
// LIVE CHART
// =========================

function updateLiveChart(brake, accel) {

    const ctx =
        document.getElementById("liveChart").getContext("2d");

    if (!liveChart) {

        liveChart = new Chart(ctx, {

            type: "line",

            data: {

                labels: labels,

                datasets: [

                    {
                        label: "Brake",

                        data: brakeData,

                        borderColor: "#ef4444",

                        fill: false
                    },

                    {
                        label: "Accelerate",

                        data: accelData,

                        borderColor: "#22c55e",

                        fill: false
                    }
                ]
            },

            options: {

                responsive: true,

                animation: false
            }
        });
    }

    let time =
        new Date().toLocaleTimeString();

    labels.push(time);

    brakeData.push(brake);

    accelData.push(accel);

    if (labels.length > 15) {

        labels.shift();
        brakeData.shift();
        accelData.shift();
    }

    liveChart.update();
}

// =========================
// CAR MOVEMENT
// =========================

function moveCars(accel) {

    let cars = [
        document.getElementById("car1"),
        document.getElementById("car2"),
        document.getElementById("car3")
    ];

    cars.forEach((car, index) => {

        let position =
            parseInt(car.style.left) || 0;

        if (accel > 50) {

            position += 20 + (index * 10);

        } else {

            position -= 10;
        }

        if (position > 900)
            position = 0;

        if (position < 0)
            position = 0;

        car.style.left = position + "px";
    });

    let redLight =
        document.getElementById("redLight");

    let yellowLight =
        document.getElementById("yellowLight");

    let greenLight =
        document.getElementById("greenLight");

    let fleetStatus =
        document.getElementById("fleetStatus");

    if (accel > 50) {

        greenLight.style.opacity = 1;
        yellowLight.style.opacity = 0.3;
        redLight.style.opacity = 0.3;

        fleetStatus.innerText =
            "Vehicles accelerating smoothly";

    } else {

        redLight.style.opacity = 1;
        yellowLight.style.opacity = 0.3;
        greenLight.style.opacity = 0.3;

        fleetStatus.innerText =
            "AI applied braking system";
    }
}

// =========================
// MAP INITIALIZATION
// =========================

window.onload = function () {

    map =
        L.map("map").setView([20.5937, 78.9629], 5);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "© OpenStreetMap"
        }
    ).addTo(map);

    let blueIcon = L.icon({

        iconUrl:
            "https://cdn-icons-png.flaticon.com/512/684/684908.png",

        iconSize: [35, 35],

        iconAnchor: [17, 35]
    });

    vehicleMarker =
        L.marker(
            [20.5937, 78.9629],
            { icon: blueIcon }
        ).addTo(map);

    if (navigator.geolocation) {

        navigator.geolocation.getCurrentPosition(

            function(position) {

                let lat =
                    position.coords.latitude;

                let lng =
                    position.coords.longitude;

                map.setView([lat, lng], 13);

                vehicleMarker.setLatLng([lat, lng]);

                getTrafficData(lat, lng);

            },

            function(error) {

                console.log(error);

            }

        );
    }

    loadData();
};
// =========================
// ENTER KEY SUPPORT
// =========================

document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("startLocation")
        .addEventListener("keypress", function(e) {

            if (e.key === "Enter") {

                findRoute();
            }
        });

    document.getElementById("endLocation")
        .addEventListener("keypress", function(e) {

            if (e.key === "Enter") {

                findRoute();
            }
        });

});

// =========================
// FIND ROUTE
// =========================

async function findRoute() {

    let start =
        document.getElementById("startLocation").value;

    let end =
        document.getElementById("endLocation").value;

    if (!end) {

        alert("Enter destination");

        return;
    }

    let startLat;
    let startLng;

    if (start.trim() === "") {

        if (navigator.geolocation) {

            const position =
                await new Promise((resolve, reject) => {

                    navigator.geolocation.getCurrentPosition(
                        resolve,
                        reject
                    );

                });

            startLat =
                position.coords.latitude;

            startLng =
                position.coords.longitude;

        } else {

            alert("Geolocation not supported");

            return;
        }

    } else {

        let startRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${start}`
        );

        let startData =
            await startRes.json();

        startLat =
            parseFloat(startData[0].lat);

        startLng =
            parseFloat(startData[0].lon);
    }

    let endRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${end}`
    );

    let endData =
        await endRes.json();

    let endLat =
        parseFloat(endData[0].lat);

    let endLng =
        parseFloat(endData[0].lon);

    if (routingControl) {

        map.removeControl(routingControl);
    }

    routingControl = L.Routing.control({

        waypoints: [

            L.latLng(startLat, startLng),

            L.latLng(endLat, endLng)

        ],

        routeWhileDragging: false,

        draggableWaypoints: false,

        addWaypoints: false,

        createMarker: function(i, wp) {

            return L.marker(wp.latLng);
        }

    }).addTo(map);

    map.setView([startLat, startLng], 7);

    vehicleMarker.setLatLng([startLat, startLng]);

    // CLEAR OLD TRAFFIC REFRESH

    if (trafficInterval) {

        clearInterval(trafficInterval);
    }

    // LOAD TRAFFIC IMMEDIATELY

    getTrafficData(endLat, endLng);

    // AUTO REFRESH TRAFFIC EVERY 15 SEC

    trafficInterval = setInterval(() => {

        getTrafficData(endLat, endLng);

    }, 15000);
}

// =========================
// START REAL TRACKING
// =========================

function startRealTracking() {

    if (watchId !== null) {

        navigator.geolocation.clearWatch(watchId);
    }

    tripStarted = true;

    tripData = [];

    totalBrakeEvents = 0;
    totalAccelEvents = 0;

    previousLat = null;
    previousLng = null;
    previousTime = null;
    previousSpeed = 0;

    document.getElementById(
        "tripStatus"
    ).innerText = "TRIP STARTED";

    document.getElementById(
        "tripStatus"
    ).style.color = "#22c55e";

    watchId = navigator.geolocation.watchPosition(

        function(position) {

            let lat =
                position.coords.latitude;

            let lng =
                position.coords.longitude;

            let currentTime =
                new Date().getTime();

            vehicleMarker.setLatLng([lat, lng]);

            map.setView([lat, lng], 15);

            getTrafficData(lat, lng);

            let speed = 0;

            if (
                previousLat !== null &&
                previousLng !== null
            ) {

                let distanceTravelled =
                    getDistanceFromLatLonInKm(
                        previousLat,
                        previousLng,
                        lat,
                        lng
                    );

                let timeDiff =
                    (currentTime - previousTime) / 1000;

                if (timeDiff > 0) {

                    speed =
                        (distanceTravelled / timeDiff) * 3600;

                    speed =
                        Math.round(speed);
                }
            }

            if (speed > 180) {

                speed = 180;
            }

            let accel = 0;
            let brake = 0;

            if (speed > previousSpeed) {

                accel =
                    speed - previousSpeed;

                totalAccelEvents++;

            } else {

                brake =
                    previousSpeed - speed;

                totalBrakeEvents++;
            }

            if (accel > 100)
                accel = 100;

            if (brake > 100)
                brake = 100;

            let distance =
                Math.floor(Math.random() * 50);

            let weather =
                Math.random() > 0.5 ? 1 : 0;

            document.getElementById(
                "liveSpeed"
            ).innerText =
                speed;

            document.getElementById(
                "liveDistance"
            ).innerText =
                distance + " m";

            document.getElementById(
                "liveWeather"
            ).innerText =
                weather;

            document.getElementById(
                "currentSpeed"
            ).innerText =
                speed;

            document.getElementById(
                "totalBrake"
            ).innerText =
                totalBrakeEvents;

            document.getElementById(
                "totalAccel"
            ).innerText =
                totalAccelEvents;

            updateLiveChart(brake, accel);

            drawChart(brake, accel);

            moveCars(accel);

            tripData.push({

                latitude: lat,
                longitude: lng,
                speed: speed,
                brake: brake,
                accel: accel,
                weather: weather,
                time: new Date().toLocaleTimeString()

            });

            previousLat = lat;
            previousLng = lng;
            previousTime = currentTime;
            previousSpeed = speed;

        },

        function(error) {

            console.log(error);

        },

        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
        }

    );
}

// =========================
// STOP TRIP
// =========================

function stopTrip() {

    localStorage.setItem(

        "tripHistory",

        JSON.stringify(tripData)

    );

    if (watchId !== null) {

        navigator.geolocation.clearWatch(watchId);

        watchId = null;
    }

    if (trafficInterval) {

        clearInterval(trafficInterval);
    }

    tripStarted = false;

    document.getElementById(
        "tripStatus"
    ).innerText = "TRIP ENDED";

    document.getElementById(
        "tripStatus"
    ).style.color = "#ef4444";

    fetch(

        "https://autonomous-fleet-ai-1.onrender.com/save_trip",

        {

            method: "POST",

            headers: {

                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                trip: tripData

            })

        }

    )

    .then(res => res.json())

    .then(data => {

        console.log(data);

        alert("Trip Saved Successfully");

    })

    .catch(error => {

        console.log(error);

        alert("Error Saving Trip");

    });

}

// =========================
// DOWNLOAD REPORT
// =========================

function downloadTripReport() {

    let report = `AI Fleet Trip Report\n\n`;

    report += `Total Points: ${tripData.length}\n\n`;

    tripData.forEach((item, index) => {

        report += `
Point ${index + 1}

Time: ${item.time}
Speed: ${item.speed} km/h
Brake: ${item.brake}
Acceleration: ${item.accel}
Weather: ${item.weather}
Latitude: ${item.latitude}
Longitude: ${item.longitude}

========================
`;
    });

    const blob = new Blob(
        [report],
        { type: "text/plain" }
    );

    const link =
        document.createElement("a");

    link.href =
        URL.createObjectURL(blob);

    link.download =
        "trip_report.txt";

    link.click();
}

// =========================
// DISTANCE FORMULA
// =========================

function getDistanceFromLatLonInKm(
    lat1,
    lon1,
    lat2,
    lon2
) {

    let R = 6371;

    let dLat =
        deg2rad(lat2 - lat1);

    let dLon =
        deg2rad(lon2 - lon1);

    let a =
        Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +

        Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *

        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    let c =
        2 * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;
}

function deg2rad(deg) {

    return deg * (Math.PI / 180);
}

// =========================
// LOAD DATABASE
// =========================

function loadData() {

    fetch("https://autonomous-fleet-ai-1.onrender.com/data")

    .then(res => res.json())

    .then(data => {

        let table =
            document.getElementById("dataTable");

        table.innerHTML = "";

        let totalSpeed = 0;
        let brakeCount = 0;
        let accelCount = 0;

        data.forEach(item => {

            totalSpeed += item.speed;

            if (item.action == 0)
                brakeCount++;

            else
                accelCount++;

            table.innerHTML += `

                <tr>

                    <td>${item.id}</td>

                    <td>${item.speed}</td>

                    <td>${item.distance}</td>

                    <td>${item.weather}</td>

                    <td>${item.action}</td>

                    <td>
                        <button onclick="deleteData(${item.id})">
                            Delete
                        </button>
                    </td>

                </tr>
            `;
        });

        document.getElementById("totalVehicles").innerText =
            data.length;

        document.getElementById("brakeCount").innerText =
            brakeCount;

        document.getElementById("accelCount").innerText =
            accelCount;

        document.getElementById("avgSpeed").innerText =
            data.length > 0
            ? (totalSpeed / data.length).toFixed(1)
            : 0;

        drawAnalytics(data);

        drawDecisionChart(brakeCount, accelCount);

    });
}

// =========================
// ANALYTICS CHART
// =========================

function drawAnalytics(data) {

    const ctx =
        document.getElementById("analyticsChart")
        .getContext("2d");

    if (analyticsChart)
        analyticsChart.destroy();

    analyticsChart = new Chart(ctx, {

        type: "line",

        data: {

            labels:
                data.map(d => d.id),

            datasets: [

                {
                    label: "Speed",

                    data:
                        data.map(d => d.speed),

                    borderColor: "#3b82f6",

                    fill: false
                }
            ]
        }
    });
}

// =========================
// PIE CHART
// =========================

function drawDecisionChart(brakeCount, accelCount) {

    const ctx =
        document.getElementById("decisionChart")
        .getContext("2d");

    if (decisionChart)
        decisionChart.destroy();

    decisionChart = new Chart(ctx, {

        type: "pie",

        data: {

            labels: [
                "Brake",
                "Accelerate"
            ],

            datasets: [{

                data: [
                    brakeCount,
                    accelCount
                ],

                backgroundColor: [
                    "#ef4444",
                    "#22c55e"
                ]
            }]
        }
    });
}

// =========================
// AI ASSISTANT
// =========================

function askAI() {

    let question =
        document.getElementById("aiQuestion").value;

    fetch(
        `https://autonomous-fleet-ai-1.onrender.com/ai_assistant?question=${question}`
    )

    .then(res => res.json())

    .then(data => {

        document.getElementById("aiResponse")
            .innerText = data.response;

    });
}

// =========================
// TRAFFIC API
// =========================

// =========================
// TRAFFIC API
// =========================

async function getTrafficData(lat, lng) {

    const apiKey =
        "18tEsbkhPAl9eB59hMx6V7QDPfH5QNXC";

    const url =
`https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lng}&key=${apiKey}`;

    try {

        const response =
            await fetch(url);

        const data =
            await response.json();

        console.log(data);

        if (!data.flowSegmentData) {

            document.getElementById(
                "trafficLevel"
            ).innerText = "Unavailable";

            document.getElementById(
                "trafficDelay"
            ).innerText = "0";

            return;
        }

        let currentSpeed =
            data.flowSegmentData.currentSpeed;

        let freeFlowSpeed =
            data.flowSegmentData.freeFlowSpeed;

        let confidence =
            data.flowSegmentData.confidence || 0;

        // SPEED DIFFERENCE

        let delay =
            Math.max(
                0,
                freeFlowSpeed - currentSpeed
            );

        // TRAFFIC PERCENTAGE

        let trafficPercent =
            ((delay / freeFlowSpeed) * 100);

        let traffic = "Low";

        // BETTER DETECTION

        if (
            trafficPercent >= 50 ||
            currentSpeed < 20
        ) {

            traffic = "High";

        }

        else if (
            trafficPercent >= 25 ||
            currentSpeed < 40
        ) {

            traffic = "Moderate";
        }

        // UPDATE UI

        document.getElementById(
            "trafficLevel"
        ).innerText =
            traffic;

        document.getElementById(
            "trafficDelay"
        ).innerText =
            delay.toFixed(1);

        console.log({
            currentSpeed,
            freeFlowSpeed,
            delay,
            trafficPercent,
            confidence,
            traffic
        });

    }

    catch(error) {

        console.log(error);

        document.getElementById(
            "trafficLevel"
        ).innerText = "Error";

        document.getElementById(
            "trafficDelay"
        ).innerText = "0";
    }
}
    // CLEAR OLD TRAFFIC REFRESH

    if (trafficInterval) {

        clearInterval(trafficInterval);
    }

    // LOAD TRAFFIC IMMEDIATELY

    getTrafficData(endLat, endLng);

    // AUTO REFRESH TRAFFIC EVERY 15 SEC

    trafficInterval = setInterval(() => {

        getTrafficData(endLat, endLng);

    }, 15000);


// =========================
// START REAL TRACKING
// =========================

function startRealTracking() {

    if (watchId !== null) {

        navigator.geolocation.clearWatch(watchId);
    }

    tripStarted = true;

    tripData = [];

    totalBrakeEvents = 0;
    totalAccelEvents = 0;

    previousLat = null;
    previousLng = null;
    previousTime = null;
    previousSpeed = 0;

    document.getElementById(
        "tripStatus"
    ).innerText = "TRIP STARTED";

    document.getElementById(
        "tripStatus"
    ).style.color = "#22c55e";

    watchId = navigator.geolocation.watchPosition(

        function(position) {

            let lat =
                position.coords.latitude;

            let lng =
                position.coords.longitude;

            let currentTime =
                new Date().getTime();

            vehicleMarker.setLatLng([lat, lng]);

            map.setView([lat, lng], 15);

            getTrafficData(lat, lng);

            let speed = 0;

            if (
                previousLat !== null &&
                previousLng !== null
            ) {

                let distanceTravelled =
                    getDistanceFromLatLonInKm(
                        previousLat,
                        previousLng,
                        lat,
                        lng
                    );

                let timeDiff =
                    (currentTime - previousTime) / 1000;

                if (timeDiff > 0) {

                    speed =
                        (distanceTravelled / timeDiff) * 3600;

                    speed =
                        Math.round(speed);
                }
            }

            if (speed > 180) {

                speed = 180;
            }

            let accel = 0;
            let brake = 0;

            if (speed > previousSpeed) {

                accel =
                    speed - previousSpeed;

                totalAccelEvents++;

            } else {

                brake =
                    previousSpeed - speed;

                totalBrakeEvents++;
            }

            if (accel > 100)
                accel = 100;

            if (brake > 100)
                brake = 100;

            let distance =
                Math.floor(Math.random() * 50);

            let weather =
                Math.random() > 0.5 ? 1 : 0;

            document.getElementById(
                "liveSpeed"
            ).innerText =
                speed;

            document.getElementById(
                "liveDistance"
            ).innerText =
                distance + " m";

            document.getElementById(
                "liveWeather"
            ).innerText =
                weather;

            document.getElementById(
                "currentSpeed"
            ).innerText =
                speed;

            document.getElementById(
                "totalBrake"
            ).innerText =
                totalBrakeEvents;

            document.getElementById(
                "totalAccel"
            ).innerText =
                totalAccelEvents;

            updateLiveChart(brake, accel);

            drawChart(brake, accel);

            moveCars(accel);

            tripData.push({

                latitude: lat,
                longitude: lng,
                speed: speed,
                brake: brake,
                accel: accel,
                weather: weather,
                time: new Date().toLocaleTimeString()

            });

            previousLat = lat;
            previousLng = lng;
            previousTime = currentTime;
            previousSpeed = speed;

        },

        function(error) {

            console.log(error);

        },

        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
        }

    );
}

// =========================
// STOP TRIP
// =========================

function stopTrip() {

    localStorage.setItem(

        "tripHistory",

        JSON.stringify(tripData)

    );

    if (watchId !== null) {

        navigator.geolocation.clearWatch(watchId);

        watchId = null;
    }

    if (trafficInterval) {

        clearInterval(trafficInterval);
    }

    tripStarted = false;

    document.getElementById(
        "tripStatus"
    ).innerText = "TRIP ENDED";

    document.getElementById(
        "tripStatus"
    ).style.color = "#ef4444";

    fetch(

        "https://autonomous-fleet-ai-1.onrender.com/save_trip",

        {

            method: "POST",

            headers: {

                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                trip: tripData

            })

        }

    )

    .then(res => res.json())

    .then(data => {

        console.log(data);

        alert("Trip Saved Successfully");

    })

    .catch(error => {

        console.log(error);

        alert("Error Saving Trip");

    });

}

// =========================
// DOWNLOAD REPORT
// =========================

function downloadTripReport() {

    let report = `AI Fleet Trip Report\n\n`;

    report += `Total Points: ${tripData.length}\n\n`;

    tripData.forEach((item, index) => {

        report += `
Point ${index + 1}

Time: ${item.time}
Speed: ${item.speed} km/h
Brake: ${item.brake}
Acceleration: ${item.accel}
Weather: ${item.weather}
Latitude: ${item.latitude}
Longitude: ${item.longitude}

========================
`;
    });

    const blob = new Blob(
        [report],
        { type: "text/plain" }
    );

    const link =
        document.createElement("a");

    link.href =
        URL.createObjectURL(blob);

    link.download =
        "trip_report.txt";

    link.click();
}

// =========================
// DISTANCE FORMULA
// =========================

function getDistanceFromLatLonInKm(
    lat1,
    lon1,
    lat2,
    lon2
) {

    let R = 6371;

    let dLat =
        deg2rad(lat2 - lat1);

    let dLon =
        deg2rad(lon2 - lon1);

    let a =
        Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +

        Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *

        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    let c =
        2 * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;
}

function deg2rad(deg) {

    return deg * (Math.PI / 180);
}

// =========================
// LOAD DATABASE
// =========================

function loadData() {

    fetch("https://autonomous-fleet-ai-1.onrender.com/data")

    .then(res => res.json())

    .then(data => {

        let table =
            document.getElementById("dataTable");

        table.innerHTML = "";

        let totalSpeed = 0;
        let brakeCount = 0;
        let accelCount = 0;

        data.forEach(item => {

            totalSpeed += item.speed;

            if (item.action == 0)
                brakeCount++;

            else
                accelCount++;

            table.innerHTML += `

                <tr>

                    <td>${item.id}</td>

                    <td>${item.speed}</td>

                    <td>${item.distance}</td>

                    <td>${item.weather}</td>

                    <td>${item.action}</td>

                    <td>
                        <button onclick="deleteData(${item.id})">
                            Delete
                        </button>
                    </td>

                </tr>
            `;
        });

        document.getElementById("totalVehicles").innerText =
            data.length;

        document.getElementById("brakeCount").innerText =
            brakeCount;

        document.getElementById("accelCount").innerText =
            accelCount;

        document.getElementById("avgSpeed").innerText =
            data.length > 0
            ? (totalSpeed / data.length).toFixed(1)
            : 0;

        drawAnalytics(data);

        drawDecisionChart(brakeCount, accelCount);

    });
}

// =========================
// ANALYTICS CHART
// =========================

function drawAnalytics(data) {

    const ctx =
        document.getElementById("analyticsChart")
        .getContext("2d");

    if (analyticsChart)
        analyticsChart.destroy();

    analyticsChart = new Chart(ctx, {

        type: "line",

        data: {

            labels:
                data.map(d => d.id),

            datasets: [

                {
                    label: "Speed",

                    data:
                        data.map(d => d.speed),

                    borderColor: "#3b82f6",

                    fill: false
                }
            ]
        }
    });
}

// =========================
// PIE CHART
// =========================

function drawDecisionChart(brakeCount, accelCount) {

    const ctx =
        document.getElementById("decisionChart")
        .getContext("2d");

    if (decisionChart)
        decisionChart.destroy();

    decisionChart = new Chart(ctx, {

        type: "pie",

        data: {

            labels: [
                "Brake",
                "Accelerate"
            ],

            datasets: [{

                data: [
                    brakeCount,
                    accelCount
                ],

                backgroundColor: [
                    "#ef4444",
                    "#22c55e"
                ]
            }]
        }
    });
}

// =========================
// AI ASSISTANT
// =========================

function askAI() {

    let question =
        document.getElementById("aiQuestion").value;

    fetch(
        `https://autonomous-fleet-ai-1.onrender.com/ai_assistant?question=${question}`
    )

    .then(res => res.json())

    .then(data => {

        document.getElementById("aiResponse")
            .innerText = data.response;

    });
}

// =========================
// TRAFFIC API
// =========================

// =========================
// TRAFFIC API
// =========================

async function getTrafficData(lat, lng) {

    const apiKey =
        "18tEsbkhPAl9eB59hMx6V7QDPfH5QNXC";

    const url =
`https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lng}&key=${apiKey}`;

    try {

        const response =
            await fetch(url);

        const data =
            await response.json();

        console.log(data);

        if (!data.flowSegmentData) {

            document.getElementById(
                "trafficLevel"
            ).innerText = "Unavailable";

            document.getElementById(
                "trafficDelay"
            ).innerText = "0";

            return;
        }

        let currentSpeed =
            data.flowSegmentData.currentSpeed;

        let freeFlowSpeed =
            data.flowSegmentData.freeFlowSpeed;

        let confidence =
            data.flowSegmentData.confidence || 0;

        // SPEED DIFFERENCE

        let delay =
            Math.max(
                0,
                freeFlowSpeed - currentSpeed
            );

        // TRAFFIC PERCENTAGE

        let trafficPercent =
            ((delay / freeFlowSpeed) * 100);

        let traffic = "Low";

        // BETTER DETECTION

        if (
            trafficPercent >= 50 ||
            currentSpeed < 20
        ) {

            traffic = "High";

        }

        else if (
            trafficPercent >= 25 ||
            currentSpeed < 40
        ) {

            traffic = "Moderate";
        }

        // UPDATE UI

        document.getElementById(
            "trafficLevel"
        ).innerText =
            traffic;

        document.getElementById(
            "trafficDelay"
        ).innerText =
            delay.toFixed(1);

        console.log({
            currentSpeed,
            freeFlowSpeed,
            delay,
            trafficPercent,
            confidence,
            traffic
        });

    }

    catch(error) {

        console.log(error);

        document.getElementById(
            "trafficLevel"
        ).innerText = "Error";

        document.getElementById(
            "trafficDelay"
        ).innerText = "0";
    }
}