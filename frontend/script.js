let chart;
let liveChart;
let analyticsChart;
let decisionChart;

let labels = [];
let brakeData = [];
let accelData = [];

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

        console.log(data);

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

    // TRAFFIC LIGHT

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
// LIVE SENSOR DATA
// =========================

setInterval(() => {

    fetch("https://autonomous-fleet-ai-1.onrender.com/simulate")

    .then(res => res.json())

    .then(data => {

        document.getElementById("speed").value =
            data.speed;

        document.getElementById("distance").value =
            data.distance;

        document.getElementById("weather").value =
            data.weather;

        document.getElementById("liveSpeed").innerText =
            data.speed;

        document.getElementById("liveDistance").innerText =
            data.distance;

        document.getElementById("liveWeather").innerText =
            data.weather;
    });

}, 3000);

// =========================
// MAP
// =========================

window.onload = function () {

    // MAP

    let map =
        L.map("map").setView([18.5, 73.8], 13);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "© OpenStreetMap"
        }
    ).addTo(map);

    let marker =
        L.marker([18.5, 73.8]).addTo(map);

    function updateMap() {

        let lat =
            18.5 + (Math.random() - 0.5) * 0.01;

        let lng =
            73.8 + (Math.random() - 0.5) * 0.01;

        marker.setLatLng([lat, lng]);

        map.setView([lat, lng]);
    }

    setInterval(updateMap, 3000);

    // LOAD DATABASE

    loadData();
};

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

        // KPI

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
// DECISION PIE CHART
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
// ADD DATA
// =========================

function addData() {

    let speed =
        document.getElementById("newSpeed").value;

    let distance =
        document.getElementById("newDistance").value;

    let weather =
        document.getElementById("newWeather").value;

    let action =
        document.getElementById("newAction").value;

    fetch(
        `https://autonomous-fleet-ai-1.onrender.com/add_data?speed=${speed}&distance=${distance}&weather=${weather}&action=${action}`,
        {
            method: "POST"
        }
    )

    .then(res => res.json())

    .then(data => {

        alert(data.message);

        loadData();
    });
}

// =========================
// DELETE DATA
// =========================

function deleteData(id) {

    fetch(
        `https://autonomous-fleet-ai-1.onrender.com/delete/${id}`,
        {
            method: "DELETE"
        }
    )

    .then(res => res.json())

    .then(data => {

        alert(data.message);

        loadData();
    });
}

// =========================
// SEARCH TABLE
// =========================

function searchTable() {

    let input =
        document.getElementById("searchInput")
        .value.toLowerCase();

    let rows =
        document.querySelectorAll("#dataTable tr");

    rows.forEach(row => {

        let text =
            row.innerText.toLowerCase();

        row.style.display =
            text.includes(input)
            ? ""
            : "none";
    });
}
// =========================
// GENERATIVE AI ASSISTANT
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