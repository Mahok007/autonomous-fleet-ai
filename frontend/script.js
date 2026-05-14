// =========================
// GLOBAL VARIABLES
// =========================

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

const API_BASE =
"https://autonomous-fleet-ai-1.onrender.com";

// =========================
// TRAIN MODEL
// =========================

function trainModel() {

    fetch(`${API_BASE}/train`)

    .then(res => res.json())

    .then(data => {

        alert(data.message || "Model Trained");

    })

    .catch(err => {

        console.log(err);

        alert("Training Failed");

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

    if (!speed || !distance || weather === "") {

        alert("Enter all prediction values");

        return;
    }

    fetch(
`${API_BASE}/predict?speed=${speed}&distance=${distance}&weather=${weather}`
    )

    .then(res => res.json())

    .then(data => {

        let brake =
        Number(data.brake_prob || 0);

        let accel =
        Number(data.accelerate_prob || 0);

        document.getElementById("result").innerText =
        `Brake: ${brake}% | Accelerate: ${accel}%`;

        drawChart(brake, accel);

        updateLiveChart(brake, accel);

        moveCars(accel);

    })

    .catch(err => {

        console.log(err);

        alert("Prediction Failed");

    });

}

// =========================
// BAR CHART
// =========================

function drawChart(brake, accel) {

    const canvas =
    document.getElementById("chart");

    if (!canvas) return;

    const ctx =
    canvas.getContext("2d");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {

        type: "bar",

        data: {

            labels: [
                "Brake",
                "Accelerate"
            ],

            datasets: [{

                label:
                "Decision Confidence (%)",

                data: [
                    brake,
                    accel
                ],

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

    const canvas =
    document.getElementById("liveChart");

    if (!canvas) return;

    const ctx =
    canvas.getContext("2d");

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

        if (!car) return;

        let position =
        parseInt(car.style.left) || 0;

        if (accel > 50) {

            position += 20 + (index * 10);

        }

        else {

            position -= 10;

        }

        if (position > 900)
            position = 0;

        if (position < 0)
            position = 0;

        car.style.left =
        position + "px";

    });

    let redLight =
    document.getElementById("redLight");

    let yellowLight =
    document.getElementById("yellowLight");

    let greenLight =
    document.getElementById("greenLight");

    let fleetStatus =
    document.getElementById("fleetStatus");

    if (
        redLight &&
        yellowLight &&
        greenLight
    ) {

        if (accel > 50) {

            greenLight.style.opacity = 1;
            yellowLight.style.opacity = 0.3;
            redLight.style.opacity = 0.3;

            if (fleetStatus) {

                fleetStatus.innerText =
                "Vehicles accelerating smoothly";

            }

        }

        else {

            redLight.style.opacity = 1;
            yellowLight.style.opacity = 0.3;
            greenLight.style.opacity = 0.3;

            if (fleetStatus) {

                fleetStatus.innerText =
                "AI applied braking system";

            }

        }
    }
}

// =========================
// MAP INITIALIZATION
// =========================

window.onload = function () {

    initializeMap();

    loadData();

    let endInput =
    document.getElementById("endLocation");

    if (endInput) {

        endInput.addEventListener(
            "keypress",
            function (e) {

                if (e.key === "Enter") {

                    findRoute();

                }

            }
        );
    }

};

// =========================
// INITIALIZE MAP
// =========================

function initializeMap() {

    const mapDiv =
    document.getElementById("map");

    if (!mapDiv) return;

    map =
    L.map("map").setView(
        [20.5937, 78.9629],
        5
    );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution:
            "© OpenStreetMap"
        }
    ).addTo(map);

    let blueIcon =
    L.icon({

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

}

// =========================
// FIND ROUTE
// =========================

async function findRoute() {

    try {

        let start =
        document.getElementById(
            "startLocation"
        ).value;

        let end =
        document.getElementById(
            "endLocation"
        ).value;

        if (!end) {

            alert("Enter destination");

            return;

        }

        let startLat;
        let startLng;

        // CURRENT LOCATION

        if (start.trim() === "") {

            const position =
            await new Promise(

                (resolve, reject) => {

                    navigator
                    .geolocation
                    .getCurrentPosition(
                        resolve,
                        reject
                    );

                }
            );

            startLat =
            position.coords.latitude;

            startLng =
            position.coords.longitude;

        }

        // MANUAL LOCATION

        else {

            let startRes =
            await fetch(
`https://nominatim.openstreetmap.org/search?format=json&q=${start}`
            );

            let startData =
            await startRes.json();

            if (!startData.length) {

                alert(
                    "Invalid Start Location"
                );

                return;

            }

            startLat =
            parseFloat(startData[0].lat);

            startLng =
            parseFloat(startData[0].lon);

        }

        // DESTINATION

        let endRes =
        await fetch(
`https://nominatim.openstreetmap.org/search?format=json&q=${end}`
        );

        let endData =
        await endRes.json();

        if (!endData.length) {

            alert(
                "Invalid Destination"
            );

            return;

        }

        let endLat =
        parseFloat(endData[0].lat);

        let endLng =
        parseFloat(endData[0].lon);

        if (routingControl) {

            map.removeControl(
                routingControl
            );

        }

        routingControl =
        L.Routing.control({

            waypoints: [

                L.latLng(
                    startLat,
                    startLng
                ),

                L.latLng(
                    endLat,
                    endLng
                )

            ],

            routeWhileDragging: false,

            draggableWaypoints: false,

            addWaypoints: false

        }).addTo(map);

        map.setView(
            [startLat, startLng],
            13
        );

        vehicleMarker.setLatLng(
            [startLat, startLng]
        );

        getTrafficData(
            endLat,
            endLng
        );

    }

    catch (err) {

        console.log(err);

        alert(
            "Route Loading Failed"
        );

    }

}

// =========================
// START TRACKING
// =========================

function startRealTracking() {

    if (!navigator.geolocation) {

        alert(
            "Geolocation Not Supported"
        );

        return;
    }

    tripStarted = true;

    document.getElementById(
        "tripStatus"
    ).innerText =
    "TRIP STARTED";

    document.getElementById(
        "tripStatus"
    ).style.color =
    "#22c55e";

    watchId =
    navigator.geolocation.watchPosition(

        function(position){

            let lat =
            position.coords.latitude;

            let lng =
            position.coords.longitude;

            vehicleMarker.setLatLng(
                [lat,lng]
            );

            map.setView(
                [lat,lng],
                15
            );

        },

        function(error){

            console.log(error);

        },

        {
            enableHighAccuracy:true
        }

    );

}

// =========================
// STOP TRIP
// =========================

function stopTrip() {

    if (watchId !== null) {

        navigator
        .geolocation
        .clearWatch(watchId);

    }

    document.getElementById(
        "tripStatus"
    ).innerText =
    "TRIP ENDED";

    document.getElementById(
        "tripStatus"
    ).style.color =
    "#ef4444";

}

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

        if (!data.flowSegmentData)
            return;

        let currentSpeed =
        data.flowSegmentData.currentSpeed;

        let freeFlowSpeed =
        data.flowSegmentData.freeFlowSpeed;

        let delay =
        Math.max(
            0,
            freeFlowSpeed -
            currentSpeed
        );

        let traffic =
        "Low";

        if (delay > 20) {

            traffic = "High";

        }

        else if (delay > 10) {

            traffic = "Moderate";

        }

        let trafficLevel =
        document.getElementById(
            "trafficLevel"
        );

        let trafficDelay =
        document.getElementById(
            "trafficDelay"
        );

        if (trafficLevel) {

            trafficLevel.innerText =
            traffic;

        }

        if (trafficDelay) {

            trafficDelay.innerText =
            delay + " mins";

        }

    }

    catch(error){

        console.log(error);

    }

}

// =========================
// DATABASE LOAD
// =========================

function loadData() {

    fetch(`${API_BASE}/data`)

    .then(res => res.json())

    .then(data => {

        let table =
        document.getElementById(
            "dataTable"
        );

        if (!table) return;

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

        updateKPIs(
            data,
            totalSpeed,
            brakeCount,
            accelCount
        );

        drawAnalytics(data);

        drawDecisionChart(
            brakeCount,
            accelCount
        );

    })

    .catch(err => {

        console.log(err);

    });

}

// =========================
// UPDATE KPIs
// =========================

function updateKPIs(
    data,
    totalSpeed,
    brakeCount,
    accelCount
) {

    let totalVehicles =
    document.getElementById(
        "totalVehicles"
    );

    let brakeEl =
    document.getElementById(
        "brakeCount"
    );

    let accelEl =
    document.getElementById(
        "accelCount"
    );

    let avgSpeed =
    document.getElementById(
        "avgSpeed"
    );

    if (totalVehicles)
        totalVehicles.innerText =
        data.length;

    if (brakeEl)
        brakeEl.innerText =
        brakeCount;

    if (accelEl)
        accelEl.innerText =
        accelCount;

    if (avgSpeed)
        avgSpeed.innerText =
        data.length > 0
        ? (
            totalSpeed /
            data.length
        ).toFixed(1)
        : 0;

}

// =========================
// ADD DATA
// =========================

function addData() {

    let speed =
    document.getElementById(
        "newSpeed"
    ).value;

    let distance =
    document.getElementById(
        "newDistance"
    ).value;

    let weather =
    document.getElementById(
        "newWeather"
    ).value;

    let action =
    document.getElementById(
        "newAction"
    ).value;

    fetch(`${API_BASE}/add_data`, {

        method: "POST",

        headers: {
            "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

            speed,
            distance,
            weather,
            action

        })

    })

    .then(res => res.json())

    .then(data => {

        alert(
            data.message ||
            "Data Added"
        );

        loadData();

    })

    .catch(err => {

        console.log(err);

    });

}

// =========================
// DELETE DATA
// =========================

function deleteData(id) {

    fetch(`${API_BASE}/delete/${id}`, {

        method: "DELETE"

    })

    .then(res => res.json())

    .then(data => {

        alert(
            data.message ||
            "Deleted"
        );

        loadData();

    })

    .catch(err => {

        console.log(err);

    });

}

// =========================
// SEARCH TABLE
// =========================

function searchTable() {

    let input =
    document.getElementById(
        "searchInput"
    );

    if (!input) return;

    let filter =
    input.value.toUpperCase();

    let table =
    document.getElementById(
        "dataTable"
    );

    let tr =
    table.getElementsByTagName("tr");

    for (let i = 0; i < tr.length; i++) {

        let td =
        tr[i].getElementsByTagName("td")[0];

        if (td) {

            let txtValue =
            td.textContent ||
            td.innerText;

            tr[i].style.display =
            txtValue.toUpperCase()
            .indexOf(filter) > -1
            ? ""
            : "none";

        }
    }
}

// =========================
// ANALYTICS CHART
// =========================

function drawAnalytics(data) {

    const canvas =
    document.getElementById(
        "analyticsChart"
    );

    if (!canvas) return;

    const ctx =
    canvas.getContext("2d");

    if (analyticsChart)
        analyticsChart.destroy();

    analyticsChart =
    new Chart(ctx, {

        type: "line",

        data: {

            labels:
            data.map(d => d.id),

            datasets: [{

                label: "Speed",

                data:
                data.map(d => d.speed),

                borderColor:
                "#3b82f6",

                fill: false

            }]
        }
    });
}

// =========================
// PIE CHART
// =========================

function drawDecisionChart(
    brakeCount,
    accelCount
) {

    const canvas =
    document.getElementById(
        "decisionChart"
    );

    if (!canvas) return;

    const ctx =
    canvas.getContext("2d");

    if (decisionChart)
        decisionChart.destroy();

    decisionChart =
    new Chart(ctx, {

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
    document.getElementById(
        "aiQuestion"
    ).value;

    if (!question) return;

    fetch(
`${API_BASE}/ai_assistant?question=${encodeURIComponent(question)}`
    )

    .then(res => res.json())

    .then(data => {

        document.getElementById(
            "aiResponse"
        ).innerText =
        data.response ||
        "No Response";

    })

    .catch(err => {

        console.log(err);

    });

}