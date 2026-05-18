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
let routeInstructions=[];

function updateSafetyScore(){

let score=

100-

(totalBrakeEvents*2)

-

(totalAccelEvents);

if(score<0){

score=0;

}

document
.getElementById(
"safetyScore"
)
.innerText=
score;

}

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

    createGauge();

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

alert("Enter destination");

return;

}

let startLat,startLng;


// CUSTOM START

if(start !== ""){

let response=
await fetch(
`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(start)}`
);

let data=
await response.json();

if(data.length===0){

alert(
"Start location not found"
);

return;

}

startLat=
parseFloat(data[0].lat);

startLng=
parseFloat(data[0].lon);

}

else{

const pos=
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
pos.coords.latitude;

startLng=
pos.coords.longitude;

}


// DESTINATION

let endResponse=
await fetch(
`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(end)}`
);

let endData=
await endResponse.json();

let endLat=
parseFloat(endData[0].lat);

let endLng=
parseFloat(endData[0].lon);


if(routingControl){

map.removeControl(
routingControl
);

}

routingControl=
L.Routing.control({

lineOptions:{

styles:[

{

color:"#00ffff",

weight:10,

opacity:0.9

},

{

color:"#38bdf8",

weight:5

}

]

},

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

routeWhileDragging:false

}).addTo(map);
routeInstructions=[];

routingControl.on(

"routesfound",

function(e){

routeInstructions=

e.routes[0]
.instructions;

});


vehicleMarker.setLatLng(
[startLat,startLng]
);

map.setView(
[startLat,startLng],
14
);

setTimeout(()=>{

map.invalidateSize();

},500);


// LOAD TRAFFIC

getTrafficData(
startLat,
startLng
);


// OPEN MAP AUTOMATICALLY

document.getElementById(
"map"
).scrollIntoView({

behavior:"smooth"

});

}

catch(error){

console.log(error);

alert(
"Route Error"
);

}

}

// =========================
// START TRACKING
// =========================



async function startRealTracking(){

tripStarted=true;

document.getElementById(
"tripStatus"
).innerText=
"TRIP STARTED";

document.getElementById(
"tripStatus"
).style.color=
"#22c55e";
startCamera();


if(watchId){

navigator.geolocation.clearWatch(
watchId
);

}


let customStart=
document.getElementById(
"startLocation"
).value.trim();


// CUSTOM LOCATION MODE

if(customStart!==""){

try{

let response=
await fetch(
`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(customStart)}`
);

let data=
await response.json();

if(data.length===0){

alert(
"Location not found"
);

return;

}

let lat=
parseFloat(data[0].lat);

let lng=
parseFloat(data[0].lon);

vehicleMarker.setLatLng(
[lat,lng]
);


// smooth live follow

map.flyTo(

[lat,lng],

17,

{

animate:true,

duration:1.5

}

);


// keep destination route updating

if(routingControl){

let destination =

routingControl
.getWaypoints()[1];

if(
destination &&
destination.latLng
){

routingControl
.setWaypoints([

L.latLng(
lat,
lng
),

destination
.latLng

]);

}

}

getTrafficData(
lat,
lng
);
getWeather(
lat,
lng
);


document.getElementById(
"currentSpeed"
).innerText=
"0";
if(gauge){

if(gauge){

gauge.data.datasets[0]
.data=[0,180];

gauge.update();

}

gauge.update();

}

tripData.push({

lat,
lng,
speed:0,

time:new Date()
.toLocaleTimeString()

});

return;

}

catch(error){

console.log(error);

}

}



// REAL GPS MODE

watchId=
navigator.geolocation.watchPosition(

function(position){

let lat=
position.coords.latitude;

let lng=
position.coords.longitude;

if(
routeInstructions &&
routeInstructions.length>0
){

routeInstructions.forEach(
step=>{

if(
step.distance &&
step.distance<100 &&
!step.spoken
){

speak(
step.text
);

let txt=
step.text
.toLowerCase();

if(
txt.includes("left")
){

document
.getElementById(
"turnArrow"
)
.innerText=
"⬅️";

}

else if(
txt.includes("right")
){

document
.getElementById(
"turnArrow"
)
.innerText=
"➡️";

}

else{

document
.getElementById(
"turnArrow"
)
.innerText=
"⬆️";

}

document
.getElementById(
"turnText"
)
.innerText=
step.text;

step.spoken=true;

}

});

}

vehicleMarker.setLatLng(
[lat,lng]
);

map.setView(
[lat,lng],
15);


// REAL SPEED ONLY

let speed=
position.coords.speed;

if(speed===null){

speed=0;

}else{

speed=
Math.round(
speed*3.6
);

}


document.getElementById(
"currentSpeed"
).innerText=
speed;


// BRAKE + ACCEL

if(speed>previousSpeed){

totalAccelEvents++;

accelData.push(speed);

brakeData.push(0);

}

else if(speed<previousSpeed){

totalBrakeEvents++;

brakeData.push(speed);

accelData.push(0);

}


document.getElementById(
"totalBrake"
).innerText=
totalBrakeEvents;

document.getElementById(
"totalAccel"
).innerText=
totalAccelEvents;


labels.push(
new Date()
.toLocaleTimeString()
);

if(labels.length>15){

labels.shift();

brakeData.shift();

accelData.shift();

}

if(liveChart){

liveChart.update();

}


previousSpeed=
speed;
updateSafetyScore();


tripData.push({

lat,
lng,
speed,

time:new Date()
.toLocaleTimeString()

});


getTrafficData(
lat,
lng
);

},

function(error){

console.log(error);

alert(
"Allow GPS permission"
);

},

{

enableHighAccuracy:true,

timeout:10000,

maximumAge:0

}

);

}
// =========================
// STOP TRIP
// =========================

function stopTrip(){

if(watchId){

navigator.geolocation.clearWatch(
watchId
);

watchId=null;

}
let allTrips=

JSON.parse(
localStorage.getItem(
"tripHistory"
)
)||[];

allTrips.push(
tripData
);

localStorage.setItem(

"tripHistory",

JSON.stringify(
allTrips
)
);
tripStarted=false;

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
    question=
question.toLowerCase();

if(
question.includes(
"zoom in"
)
){

map.zoomIn();

return;

}

if(
question.includes(
"zoom out"
)
){

map.zoomOut();

return;

}

if(
question.includes(
"show traffic"
)
){

let pos=
vehicleMarker
.getLatLng();

getTrafficData(
pos.lat,
pos.lng
);

return;

}

    if(!question) return;

    if(
question.includes(
"navigate home"
)
){

document
.getElementById(
"endLocation"
)
.value=
"Home";

findRoute();

return;

}

if(
question.includes(
"am i safe"
)
){

document
.getElementById(
"aiResponse"
)
.innerText=

"Safety score: "

+

document
.getElementById(
"safetyScore"
)
.innerText;

return;

}

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

let trafficLevel=
document.getElementById(
"trafficLevel"
);

let trafficDelay=
document.getElementById(
"trafficDelay"
);


// SHOW LOADING IMMEDIATELY

if(trafficLevel){

trafficLevel.innerText=
"Loading...";

}

try{

const apiKey=
"18tEsbkhPAl9eB59hMx6V7QDPfH5QNXC";

const url=
`https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lng}&key=${apiKey}`;

const response=
await fetch(url);

const data=
await response.json();

console.log(data);


// NO DATA

if(
!data ||
!data.flowSegmentData
){

trafficLevel.innerText=
"Low";

trafficDelay.innerText=
"0 mins";

return;

}


let currentSpeed=
data.flowSegmentData.currentSpeed || 0;

let freeFlowSpeed=
data.flowSegmentData.freeFlowSpeed || 0;


let delay=
Math.max(
0,
freeFlowSpeed-currentSpeed
);


let traffic=
"Low";

let color=
"green";


if(delay>20){

traffic=
"High";

color=
"red";

}

else if(delay>10){

traffic=
"Moderate";

color=
"orange";

}


// UPDATE UI

trafficLevel.innerText=
traffic;

trafficDelay.innerText=
delay+" mins";


// REMOVE OLD CIRCLE

if(trafficCircle){

map.removeLayer(
trafficCircle
);

}


// CREATE NEW TRAFFIC ZONE

trafficCircle=
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

console.log(
"Traffic Error:",
error
);


// FALLBACK

trafficLevel.innerText=
"Low";

trafficDelay.innerText=
"0 mins";

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
async function getWeather(lat,lng){

try{

const apiKey=
"abcd025b875b6e22fcf6b7c846188305";

const response=
await fetch(

`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${apiKey}`

);

const data=
await response.json();

document.getElementById(
"weatherCondition"
).innerText=
data.weather[0].main;

document.getElementById(
"weatherTemp"
).innerText=
Math.round(
data.main.temp
);

}

catch(error){

console.log(error);

document.getElementById(
"weatherCondition"
).innerText=
"Unavailable";

}
}

/// voice
function startVoice(){

if(
!("webkitSpeechRecognition" in window)
){

alert(
"Voice recognition not supported in this browser"
);

return;

}

const recognition =
new webkitSpeechRecognition();

recognition.lang="en-US";

recognition.continuous=false;

recognition.interimResults=false;

recognition.start();

document.getElementById(
"aiResponse"
).innerText=
"🎤 Listening... Speak now";

recognition.onresult=
function(event){

let text=
event.results[0][0]
.transcript;

document.getElementById(
"aiQuestion"
).value=
text;

document.getElementById(
"aiResponse"
).innerText=
"You said: "+text;


// commands

if(
text.toLowerCase()
.includes("start trip")
){

startRealTracking();
}

if(
text.toLowerCase()
.includes("stop trip")
){

stopTrip();
return;

}

if(
text.toLowerCase()
.includes("find route")
){

findRoute();
return;

}


// send to AI assistant

askAI();

};

recognition.onerror=
function(){

document.getElementById(
"aiResponse"
).innerText=
"Microphone Error";

};

}

let gauge;

function createGauge(){

gauge=
new Chart(

document.getElementById(
"speedometer"
),

{

type:"doughnut",

data:{

labels:["Speed"],

datasets:[{

data:[
0,
180
]

}]

}

});

}
// =========================
// DOWNLOAD PDF REPORT
// =========================

async function downloadTripReport(){

try{

const {jsPDF}=window.jspdf;

const pdf=
new jsPDF(
"p",
"mm",
"a4"
);

pdf.setFontSize(22);

pdf.text(
"Fleet AI Report",
20,
20
);

pdf.setFontSize(12);

pdf.text(
"Trip Points: "+
tripData.length,
20,
40
);

pdf.text(
"Brake Events: "+
totalBrakeEvents,
20,
55
);

pdf.text(
"Acceleration Events: "+
totalAccelEvents,
20,
70
);

pdf.text(
"Generated: "+
new Date().toLocaleString(),
20,
85
);


// refresh leaflet

map.invalidateSize();


// wait for map tiles

await new Promise(
resolve=>
setTimeout(
resolve,
3000
)
);


// force redraw

map.panBy([1,1]);

map.panBy([-1,-1]);

await new Promise(
resolve=>
setTimeout(
resolve,
1000
)
);


// capture map

const canvas=
await html2canvas(

document.getElementById(
"map"
),

{

useCORS:true,

allowTaint:true,

backgroundColor:"#ffffff",

scale:2

}

);

const image=
canvas.toDataURL(
"image/png"
);

pdf.addImage(

image,

"PNG",

10,

100,

190,

95

);

pdf.save(
"fleet_report.pdf"
);

}

catch(error){

console.log(error);

alert(
"PDF generation failed"
);

}

}
/// Speak
function speak(text){

let mode=

document.getElementById(
"voiceMode"
).value;

if(mode==="none")
return;

const speech=

new SpeechSynthesisUtterance(
text
);

let voices=
speechSynthesis.getVoices();


if(mode==="female"){

speech.voice=

voices.find(

v=>
v.name
.toLowerCase()
.includes(
"female"
)

)||voices[0];

}

if(mode==="male"){

speech.voice=

voices.find(

v=>
v.name
.toLowerCase()
.includes(
"male"
)

)||voices[0];

}

speech.rate=1;

speechSynthesis.speak(
speech
);

}

// START CAMERA

async function startCamera(){

let cam=
document.getElementById(
"camera"
);

if(!cam)
return;

try{

const stream=

await navigator
.mediaDevices
.getUserMedia({
video:{

facingMode:{
ideal:"environment"
},

width:{
ideal:1280
},

height:{
ideal:720
}

},
audio:false

});

cam.srcObject=
stream;

await cam.play();

await loadObjects();
await loadFaceModels();

await new Promise(
resolve=>
setTimeout(
resolve,
3000
)
);

startEmotionDetection();

if(
!detectionRunning
){

startEyeDetection();

detectionRunning=true;

}

setInterval(
detectLane,
2000
);

setInterval(
detectRoad,
2000
);

startEmotionDetection();

if(
!detectionRunning
){

startEyeDetection();

detectionRunning=true;

}

}

catch(error){

console.log(
"Camera Error",
error
);

alert(
"Allow camera permission"
);

}

}

// LOAD AI MODELS

async function loadFaceModels(){

await faceapi
.nets
.tinyFaceDetector
.loadFromUri(
"https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/"
);

await faceapi
.nets
.faceLandmark68Net
.loadFromUri(
"https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/"
);

await faceapi
.nets
.faceExpressionNet
.loadFromUri(
"https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/"
);

}



// DISTANCE

function distance(a,b){

return Math.sqrt(

Math.pow(
a.x-b.x,
2
)

+

Math.pow(
a.y-b.y,
2
)

);

}



// EYE RATIO

function eyeAspectRatio(eye){

let A=

distance(
eye[1],
eye[5]
);

let B=

distance(
eye[2],
eye[4]
);

let C=

distance(
eye[0],
eye[3]
);

return (A+B)/(2*C);

}



// REAL EYE DETECTION

// REAL EYE DETECTION

function startEyeDetection(){

setInterval(

async()=>{

let cam=

document.getElementById(
"camera"
);

if(!cam)
return;


const detection=

await faceapi

.detectSingleFace(

cam,

new faceapi
.TinyFaceDetectorOptions()

)

.withFaceLandmarks();


if(!detection)
return;


let leftEye=

detection
.landmarks
.getLeftEye();

let rightEye=

detection
.landmarks
.getRightEye();


let leftEAR=

eyeAspectRatio(
leftEye
);

let rightEAR=

eyeAspectRatio(
rightEye
);


let avgEAR=

(
leftEAR+
rightEAR
)/2;


if(
avgEAR<0.29
){

if(
!eyeClosedStart
){

eyeClosedStart=
Date.now();

}

if(

Date.now()

-

eyeClosedStart

>

5000

&&

!drowsyTriggered

){

document
.getElementById(
"drowsyAlert"
)
.style.display=
"block";

document
.getElementById(
"alarm"
)
.play();

speak(
"Driver is drowsy"
);

drowsyTriggered=true;

}

}

else{

eyeClosedStart=
null;

drowsyTriggered=
false;

document
.getElementById(
"drowsyAlert"
)
.style.display=
"none";

let alarm=
document.getElementById(
"alarm"
);

if(alarm){

alarm.pause();

alarm.currentTime=0;

}

}

},

300

);

}


// EMOTION DETECTION

function startEmotionDetection(){

setInterval(

async()=>{

let cam=
document.getElementById(
"camera"
);

if(!cam)
return;

const result=

await faceapi

.detectSingleFace(

cam,

new faceapi
.TinyFaceDetectorOptions()

)

.withFaceExpressions();

if(!result)
return;

let expressions=
result.expressions;

let emotion=

Object.keys(
expressions
)

.reduce(

(a,b)=>

expressions[a]>
expressions[b]

?

a

:

b

);

document
.getElementById(
"emotion"
)
.innerText=

"Emotion: "
+
emotion;

},

1500

);

}

///object detection
let model;

async function loadObjects(){

model=

await cocoSsd.load();

detectObjects();

}
async function detectObjects(){

setInterval(

async()=>{

const cam=
document.getElementById(
"camera"
);

if(
!cam
||
!model
)
return;

const predictions=

await model.detect(
cam
);

let names=

predictions
.map(
p=>p.class
);

document
.getElementById(
"objectDetect"
)
.innerText=

"Objects: "

+

names.join(",");


// TRAFFIC SIGN

if(
names.includes(
"stop sign"
)
){

document
.getElementById(
"trafficSign"
)
.innerText=
"STOP Sign";

speak(
"Stop sign ahead"
);

}

else{

document
.getElementById(
"trafficSign"
)
.innerText=
"None";

}

},

1000

);

}

// LANE DETECTION

async function detectLane(){

const cam=
document.getElementById(
"camera"
);

if(!cam)
return;

const canvas=
document.createElement(
"canvas"
);

canvas.width=
cam.videoWidth;

canvas.height=
cam.videoHeight;

const ctx=
canvas.getContext(
"2d"
);

ctx.drawImage(
cam,
0,
0
);

canvas.toBlob(

async(blob)=>{

let form=
new FormData();

form.append(
"frame",
blob
);

const response=
await fetch(

"https://autonomous-fleet-ai-1.onrender.com/detect_lane",

{

method:"POST",

body:form

}

);

const data=
await response.json();

document
.getElementById(
"laneStatus"
)
.innerText=

"Lane: "

+

data.lane;

}

);

}


// ROAD SEGMENTATION

async function detectRoad(){

const cam=
document.getElementById(
"camera"
);

if(!cam)
return;

const canvas=
document.createElement(
"canvas"
);

canvas.width=
cam.videoWidth;

canvas.height=
cam.videoHeight;

const ctx=
canvas.getContext(
"2d"
);

ctx.drawImage(
cam,
0,
0
);

canvas.toBlob(

async(blob)=>{

let form=
new FormData();

form.append(
"frame",
blob
);

const response=
await fetch(

"https://autonomous-fleet-ai-1.onrender.com/road_segment",

{

method:"POST",

body:form

}

);

const data=
await response.json();

document
.getElementById(
"roadStatus"
)
.innerText=

"Road: "

+

data.road;

}

);

}