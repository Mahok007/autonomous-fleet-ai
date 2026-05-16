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

// =========================
// AUTH CHECK
// =========================

let token =
localStorage.getItem("token");

if(!token){

window.location.href =
"login.html";

}

let vehicleMarker;

let trafficCircle = null;
let heatLayers = [];

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
// WINDOW LOAD
// =========================


window.onload = function () {

    initializeMap();

    initializeCharts();

    loadData();

    // GET CURRENT LOCATION + TRAFFIC

    if(navigator.geolocation){

        navigator.geolocation.getCurrentPosition(

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
                    13
                );

                getTrafficData(
                    lat,
                    lng
                );

            },

            function(error){

                console.log(error);

                document.getElementById(
                    "trafficLevel"
                ).innerText =
                "Location Denied";

            }

        );

    }

    let endInput =
    document.getElementById(
        "endLocation"
    );

    if(endInput){

        endInput.addEventListener(

            "keypress",

            function(e){

                if(e.key==="Enter"){

                    findRoute();

                }

            }

        );

    }

};
// =========================
// INITIALIZE MAP
// =========================

function initializeMap(){

    if(!document.getElementById("map"))
        return;

    map =
    L.map("map").setView(
        [20.5937,78.9629],
        5
    );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution:"© OpenStreetMap"
        }
    ).addTo(map);

    let blueIcon =
    L.icon({

        iconUrl:
"https://cdn-icons-png.flaticon.com/512/684/684908.png",

        iconSize:[35,35],

        iconAnchor:[17,35]

    });

    vehicleMarker =
    L.marker(
        [20.5937,78.9629],
        {icon:blueIcon}
    ).addTo(map);

}

// =========================
// INITIALIZE CHARTS
// =========================

function initializeCharts(){

    // LIVE CHART

    const liveCanvas =
    document.getElementById("liveChart");

    if(liveCanvas){

        liveChart =
        new Chart(
            liveCanvas.getContext("2d"),
            {

                type:"line",

                data:{

                    labels:labels,

                    datasets:[

                        {

                            label:"Brake",

                            data:brakeData,

                            borderColor:"#ef4444",

                            fill:false

                        },

                        {

                            label:"Accelerate",

                            data:accelData,

                            borderColor:"#22c55e",

                            fill:false

                        }

                    ]

                },

                options:{
                    responsive:true
                }

            }
        );

    }

}

// =========================
// TRAIN MODEL
// =========================

function trainModel(){

    fetch(`${API_BASE}/train`)

    .then(res=>res.json())

    .then(data=>{

        alert(
            data.message ||
            "Model Trained"
        );

    })

    .catch(err=>{

        console.log(err);

        alert("Training Failed");

    });

}

// =========================
// PREDICT
// =========================

function predict(){

    let speed =
    document.getElementById("speed").value;

    let distance =
    document.getElementById("distance").value;

    let weather =
    document.getElementById("weather").value;

    if(!speed || !distance || weather===""){

        alert("Enter all fields");

        return;

    }

    fetch(
`${API_BASE}/predict?speed=${speed}&distance=${distance}&weather=${weather}`
    )

    .then(res=>res.json())

    .then(data=>{

        let brake =
        Number(data.brake_prob || 0);

        let accel =
        Number(data.accelerate_prob || 0);

        document.getElementById("result").innerText =
        `Brake: ${brake}% | Accelerate: ${accel}%`;

        drawChart(brake,accel);

        updateLiveChart(brake,accel);

        moveCars(accel);

    })

    .catch(err=>{

        console.log(err);

        alert("Prediction Failed");

    });

}

// =========================
// BAR CHART
// =========================

function drawChart(brake,accel){

    const canvas =
    document.getElementById("chart");

    if(!canvas) return;

    const ctx =
    canvas.getContext("2d");

    if(chart) chart.destroy();

    chart =
    new Chart(ctx,{

        type:"bar",

        data:{

            labels:[
                "Brake",
                "Accelerate"
            ],

            datasets:[{

                label:"Decision Confidence (%)",

                data:[
                    brake,
                    accel
                ],

                backgroundColor:[
                    "#ef4444",
                    "#22c55e"
                ]

            }]

        },

        options:{

            responsive:true,

            scales:{

                y:{
                    beginAtZero:true,
                    max:100
                }

            }

        }

    });

}

// =========================
// LIVE CHART
// =========================

function updateLiveChart(brake,accel){

    if(!liveChart) return;

    labels.push(
        new Date().toLocaleTimeString()
    );

    brakeData.push(brake);

    accelData.push(accel);

    if(labels.length>15){

        labels.shift();

        brakeData.shift();

        accelData.shift();

    }

    liveChart.update();

}

// =========================
// MOVE CARS
// =========================

function moveCars(accel){

    let cars=[

        document.getElementById("car1"),
        document.getElementById("car2"),
        document.getElementById("car3")

    ];

    cars.forEach((car,index)=>{

        if(!car) return;

        let position =
        parseInt(car.style.left)||0;

        if(accel>50){

            position += 20 + (index*10);

        }

        else{

            position -= 10;

        }

        if(position>900)
            position=0;

        if(position<0)
            position=0;

        car.style.left =
        position + "px";

    });

}

// =========================
// FIND ROUTE
// =========================

async function findRoute(){

try{

let start=
document.getElementById(
"startLocation"
).value.trim();

let end=
document.getElementById(
"endLocation"
).value.trim();

if(!end){

alert(
"Enter destination"
);

return;

}

let startLat;
let startLng;


// USE MANUAL LOCATION
// IF ENTERED

if(start!==""){

let startRes=
await fetch(
`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(start)}`
);

let startData=
await startRes.json();

if(startData.length===0){

alert(
"Start location not found"
);

return;

}

startLat=
parseFloat(
startData[0].lat
);

startLng=
parseFloat(
startData[0].lon
);

}


// USE CURRENT LOCATION
// ONLY IF EMPTY

else{

const position=
await new Promise(

(resolve,reject)=>{

navigator.geolocation
.getCurrentPosition(

resolve,
reject

);

}

);

startLat=
position.coords.latitude;

startLng=
position.coords.longitude;

}


// DESTINATION

let endRes=
await fetch(
`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(end)}`
);

let endData=
await endRes.json();

if(endData.length===0){

alert(
"Destination not found"
);

return;

}

let endLat=
parseFloat(
endData[0].lat
);

let endLng=
parseFloat(
endData[0].lon
);


// REMOVE OLD ROUTE

if(routingControl){

map.removeControl(
routingControl
);

}


// NEW ROUTE

routingControl=
L.Routing.control({

waypoints:[

L.latLng(
startLat,
startLng
),

L.latLng(
endLat,
endLng
)

],

routeWhileDragging:false,

draggableWaypoints:false,

addWaypoints:false

}).addTo(map);


// MOVE MARKER TO START

vehicleMarker.setLatLng(

[startLat,startLng]

);


// OPEN MAP AUTOMATICALLY

map.setView(

[startLat,startLng],
13

);

setTimeout(()=>{

map.invalidateSize();

},500);


// AUTO SCROLL

document.getElementById(
"map"
).scrollIntoView({

behavior:"smooth"

});


// LOAD TRAFFIC FAST

getTrafficData(
startLat,
startLng
);

}

catch(err){

console.log(err);

alert(
"Route Failed"
);

}

}
function stopTrip(){

if(watchId){

navigator.geolocation.clearWatch(
watchId
);

}

if(simulationInterval){

clearInterval(
simulationInterval
);

}

document.getElementById(
"tripStatus"
).innerText=
"TRIP ENDED";

document.getElementById(
"tripStatus"
).style.color=
"#ef4444";

}
// =========================
// STOP TRIP
// =========================

function stopTrip(){

    if(watchId!==null){

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
// LOAD DATA
// =========================

function loadData(){

    fetch(`${API_BASE}/data`)

    .then(res=>res.json())

    .then(data=>{

        let table =
        document.getElementById(
            "dataTable"
        );

        if(table){

            table.innerHTML="";

            data.forEach(item=>{

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

        }

        drawAnalytics(data);

        let brakeCount =
        data.filter(
            d=>d.action==0
        ).length;

        let accelCount =
        data.filter(
            d=>d.action==1
        ).length;

        drawDecisionChart(
            brakeCount,
            accelCount
        );

    })

    .catch(err=>{

        console.log(err);

    });

}

// =========================
// ANALYTICS CHART
// =========================

function drawAnalytics(data){

    const canvas =
    document.getElementById(
        "analyticsChart"
    );

    if(!canvas) return;

    const ctx =
    canvas.getContext("2d");

    if(analyticsChart)
        analyticsChart.destroy();

    analyticsChart =
    new Chart(ctx,{

        type:"line",

        data:{

            labels:
            data.map(d=>d.id),

            datasets:[{

                label:"Speed",

                data:
                data.map(d=>d.speed),

                borderColor:"#3b82f6",

                fill:false

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
){

    const canvas =
    document.getElementById(
        "decisionChart"
    );

    if(!canvas) return;

    const ctx =
    canvas.getContext("2d");

    if(decisionChart)
        decisionChart.destroy();

    decisionChart =
    new Chart(ctx,{

        type:"pie",

        data:{

            labels:[
                "Brake",
                "Accelerate"
            ],

            datasets:[{

                data:[
                    brakeCount,
                    accelCount
                ],

                backgroundColor:[
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

function addData(){

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

    fetch(`${API_BASE}/add_data`,{

        method:"POST",

        headers:{
            "Content-Type":
            "application/json"
        },

        body:JSON.stringify({

            speed,
            distance,
            weather,
            action

        })

    })

    .then(res=>res.json())

    .then(data=>{

        alert(
            data.message ||
            "Data Added"
        );

        loadData();

    });

}

// =========================
// DELETE DATA
// =========================

function deleteData(id){

    fetch(`${API_BASE}/delete/${id}`,{

        method:"DELETE"

    })

    .then(res=>res.json())

    .then(data=>{

        alert(
            data.message ||
            "Deleted"
        );

        loadData();

    });

}

// =========================
// SEARCH TABLE
// =========================

function searchTable(){

    let input =
    document.getElementById(
        "searchInput"
    );

    if(!input) return;

    let filter =
    input.value.toUpperCase();

    let table =
    document.getElementById(
        "dataTable"
    );

    let tr =
    table.getElementsByTagName("tr");

    for(let i=0;i<tr.length;i++){

        let td =
        tr[i].getElementsByTagName("td")[0];

        if(td){

            let txtValue =
            td.textContent ||
            td.innerText;

            tr[i].style.display =
            txtValue
            .toUpperCase()
            .indexOf(filter)>-1
            ? ""
            : "none";

        }

    }

}

// =========================
// AI ASSISTANT
// =========================

function askAI(){

    let question =
    document.getElementById(
        "aiQuestion"
    ).value;

    if(!question) return;

    fetch(
`${API_BASE}/ai_assistant?question=${encodeURIComponent(question)}`
    )

    .then(res=>res.json())

    .then(data=>{

        document.getElementById(
            "aiResponse"
        ).innerText =
        data.response ||
        "No Response";

    });

}

// =========================
// TRAFFIC API + HEATMAP
// =========================

async function getTrafficData(lat,lng){

    const apiKey =
    "18tEsbkhPAl9eB59hMx6V7QDPfH5QNXC";

    const url =
`https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lng}&key=${apiKey}`;

    try{

        const response =
        await fetch(url);

        const data =
        await response.json();

        if(!data.flowSegmentData){

            let trafficLevel =
            document.getElementById(
            "trafficLevel"
            );

            if(trafficLevel){

                trafficLevel.innerText =
                "No Data";

            }

            return;

        }

        let currentSpeed =
        data.flowSegmentData.currentSpeed;

        let freeFlowSpeed =
        data.flowSegmentData.freeFlowSpeed;

        let delay =
        Math.max(
            0,
            freeFlowSpeed-currentSpeed
        );

        let traffic="Low";

        let color="green";

        if(delay>20){

            traffic="High";

            color="red";

        }

        else if(delay>10){

            traffic="Moderate";

            color="orange";

        }

        let trafficLevel =
        document.getElementById(
        "trafficLevel"
        );

        let trafficDelay =
        document.getElementById(
        "trafficDelay"
        );

        if(trafficLevel){

            trafficLevel.innerText =
            traffic;

        }

        if(trafficDelay){

            trafficDelay.innerText =
            delay + " mins";

        }

        if(trafficCircle){

            map.removeLayer(
            trafficCircle
            );

        }

        trafficCircle =
        L.circle(

            [lat,lng],

            {

                radius:300,

                color:color,

                fillColor:color,

                fillOpacity:0.35

            }

        ).addTo(map);

    }

    catch(error){

        console.log(error);

        let trafficLevel =
        document.getElementById(
        "trafficLevel"
        );

        let trafficDelay =
        document.getElementById(
        "trafficDelay"
        );

        if(trafficLevel){

            trafficLevel.innerText =
            "API Error";

        }

        if(trafficDelay){

            trafficDelay.innerText =
            "0";

        }

    }

}

// =========================
// LOGOUT
// =========================

function logout(){

localStorage.removeItem("token");

window.location.href =
"login.html";

}

