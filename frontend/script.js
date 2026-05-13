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

    if (labels.length > 10) {

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

    // GET CURRENT LOCATION ONLY FOR MAP

    if (navigator.geolocation) {

        navigator.geolocation.getCurrentPosition(

            function(position) {

                let lat =
                    position.coords.latitude;

                let lng =
                    position.coords.longitude;

                // MOVE MAP TO CURRENT LOCATION

                map.setView([lat, lng], 13);

                // SET VEHICLE MARKER

                vehicleMarker.setLatLng([lat, lng]);

            },

            function(error) {

                console.log(error);

            }

        );
    }

    // LOAD DATABASE

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

    // =========================
    // USE CURRENT LOCATION
    // =========================

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

    // =========================
    // USE MANUAL START LOCATION
    // =========================

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

    // =========================
    // DESTINATION LOCATION
    // =========================

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

        routeWhileDragging: false

    }).addTo(map);

    // START VEHICLE MOVEMENT

    routingControl.on('routesfound', function(e) {

        let route =
            e.routes[0].coordinates;

        startTripSimulation(route);

    });

    map.setView([startLat, startLng], 7);
}
// =========================
// START TRIP SIMULATION
// =========================

function startTripSimulation(routeCoordinates) {

    if (tripInterval) {

        clearInterval(tripInterval);
    }

    let index = 0;

    tripInterval = setInterval(() => {

        if (index >= routeCoordinates.length) {

            clearInterval(tripInterval);

            alert("Trip Completed");

            return;
        }

        let point =
            routeCoordinates[index];

        let lat =
            point.lat;

        let lng =
            point.lng;

        vehicleMarker.setLatLng([lat, lng]);

        map.setView([lat, lng], 15);

        // RANDOM DRIVING DATA

        let speed =
            Math.floor(Math.random() * 100);

        let brake =
            Math.floor(Math.random() * 100);

        let accel =
            100 - brake;

        document.getElementById("liveSpeed").innerText =
            speed;

        document.getElementById("liveDistance").innerText =
            Math.floor(Math.random() * 50);

        document.getElementById("liveWeather").innerText =
            Math.random() > 0.5 ? 1 : 0;

        updateLiveChart(brake, accel);

        moveCars(accel);

        index++;

    }, 1000);
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
// ANALYTICS
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