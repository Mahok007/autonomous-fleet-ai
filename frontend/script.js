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

let tripInterval = null;
let tripData = [];

let watchId = null;
let tripStarted = false;

// REAL CALCULATION VARIABLES

let previousLat = null;
let previousLng = null;
let previousTime = null;
let previousSpeed = 0;

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

    vehicleMarker =
        L.marker([20.5937, 78.9629]).addTo(map);

    // CURRENT LOCATION ONLY ONCE

    if (navigator.geolocation) {

        navigator.geolocation.getCurrentPosition(

            function(position) {

                let lat =
                    position.coords.latitude;

                let lng =
                    position.coords.longitude;

                map.setView([lat, lng], 13);

                vehicleMarker.setLatLng([lat, lng]);

            },

            function(error) {

                console.log(error);

            }

        );
    }

    loadData();
};

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

    // CURRENT LOCATION

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

    }

    // MANUAL LOCATION

    else {

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

    // DESTINATION

    let endRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${end}`
    );

    let endData =
        await endRes.json();

    let endLat =
        parseFloat(endData[0].lat);

    let endLng =
        parseFloat(endData[0].lon);

    // REMOVE OLD ROUTE

    if (routingControl) {

        map.removeControl(routingControl);
    }

    // CREATE ROUTE

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

    startRealTracking();
}

// =========================
// START REAL GPS TRACKING
// =========================

function startRealTracking() {

    if (watchId !== null) {

        navigator.geolocation.clearWatch(watchId);
    }

    tripStarted = true;

    tripData = [];

    previousLat = null;
    previousLng = null;
    previousTime = null;
    previousSpeed = 0;

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

            // =========================
            // REAL SPEED
            // =========================

            let speed = 0;

            if (
                previousLat !== null &&
                previousLng !== null
            ) {

                let distance =
                    getDistanceFromLatLonInKm(
                        previousLat,
                        previousLng,
                        lat,
                        lng
                    );

                let timeDiff =
                    (currentTime - previousTime) / 1000;

                speed =
                    (distance / timeDiff) * 3600;

                speed =
                    Math.round(speed);
            }

            // =========================
            // REAL BRAKE & ACCELERATION
            // =========================

            let accel = 0;
            let brake = 0;

            if (speed > previousSpeed) {

                accel =
                    speed - previousSpeed;

            } else {

                brake =
                    previousSpeed - speed;
            }

            if (accel > 100)
                accel = 100;

            if (brake > 100)
                brake = 100;

            // =========================
            // RANDOM SENSOR VALUES
            // =========================

            let distance =
                Math.floor(Math.random() * 50);

            let weather =
                Math.random() > 0.5 ? 1 : 0;

            // =========================
            // UPDATE UI
            // =========================

            document.getElementById(
                "liveSpeed"
            ).innerText = speed;

            document.getElementById(
                "liveDistance"
            ).innerText = distance;

            document.getElementById(
                "liveWeather"
            ).innerText = weather;

            // =========================
            // UPDATE CHARTS
            // =========================

            updateLiveChart(brake, accel);

            drawChart(brake, accel);

            moveCars(accel);

            // =========================
            // SAVE TRIP DATA
            // =========================

            tripData.push({

                speed: speed,
                brake: brake,
                accel: accel,
                latitude: lat,
                longitude: lng,
                time: new Date().toLocaleTimeString()

            });

            // SAVE PREVIOUS VALUES

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

    if (watchId !== null) {

        navigator.geolocation.clearWatch(watchId);

        watchId = null;
    }

    tripStarted = false;

    alert("Trip Ended Successfully");
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

    let d = R * c;

    return d;
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