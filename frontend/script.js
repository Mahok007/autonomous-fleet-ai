// =========================
// AUTH CHECK
// =========================
 
if (!localStorage.getItem("token")) {
  window.location.href = "login.html";
}
 
// =========================
// GLOBAL VARIABLES
// =========================
 
const API_BASE = "https://autonomous-fleet-ai-1.onrender.com";
 
let map;
let routingControl;
let vehicleMarker;
let trafficCircle = null;
 
let watchId = null;
let tripStarted = false;
let tripData = [];
 
let routeInstructions = [];
 
let chart;
let liveChart;
let analyticsChart;
let decisionChart;
let gauge;
 
let labels = [];
let brakeData = [];
let accelData = [];
 
let previousSpeed = 0;
 
let totalBrakeEvents = 0;
let totalAccelEvents = 0;
 
let detectionRunning = false;
let eyeClosedStart = null;
let drowsyTriggered = false;
 
let roadStream;
let driverStream;
 
let model;
let objectInterval = null;
 
let db;
let recorder;
let chunks = [];
let saveDirectory;
 
// =========================
// WINDOW LOAD
// =========================
 
window.onload = function () {
 
  // Night mode
  let hour = new Date().getHours();
  if (hour >= 18 || hour <= 6) {
    document.body.style.filter = "brightness(0.8) contrast(1.3)";
  }
 
  initDB();
  initializeMap();
  initializeCharts();
  createGauge();
  loadData();
 
  // Get current location for traffic on load
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        let lat = position.coords.latitude;
        let lng = position.coords.longitude;
        vehicleMarker.setLatLng([lat, lng]);
        map.setView([lat, lng], 13);
        getTrafficData(lat, lng);
        getWeather(lat, lng);
      },
      function (error) {
        console.log(error);
        document.getElementById("trafficLevel").innerText = "Location Denied";
      }
    );
  }
 
  // Enter key on destination
  let endInput = document.getElementById("endLocation");
  if (endInput) {
    endInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") findRoute();
    });
  }
};
 
// =========================
// INITIALIZE MAP
// =========================
 
function initializeMap() {
  if (!document.getElementById("map")) return;
 
  map = L.map("map").setView([20.5937, 78.9629], 5);
 
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);
 
  let blueIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
    iconSize: [35, 35],
    iconAnchor: [17, 35]
  });
 
  vehicleMarker = L.marker([20.5937, 78.9629], { icon: blueIcon }).addTo(map);
}
 
// =========================
// INITIALIZE CHARTS
// =========================
 
function initializeCharts() {
  const liveCanvas = document.getElementById("liveChart");
  if (liveCanvas) {
    liveChart = new Chart(liveCanvas.getContext("2d"), {
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
      options: { responsive: true }
    });
  }
}
 
// =========================
// SPEEDOMETER GAUGE
// =========================
 
function createGauge() {
  const canvas = document.getElementById("speedometer");
  if (!canvas) return;
 
  gauge = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Speed"],
      datasets: [
        {
          data: [0, 180],
          backgroundColor: ["#22c55e", "#1e293b"]
        }
      ]
    },
    options: {
      cutout: "75%",
      plugins: {
        legend: { display: false }
      }
    }
  });
}
 
// =========================
// UPDATE SAFETY SCORE
// =========================
 
function updateSafetyScore() {
  let score = 100 - totalBrakeEvents * 2 - totalAccelEvents;
  if (score < 0) score = 0;
  document.getElementById("safetyScore").innerText = score;
}
 
// =========================
// FIND ROUTE
// =========================
 
async function findRoute() {
  try {
    let start = document.getElementById("startLocation").value.trim();
    let end = document.getElementById("endLocation").value.trim();
 
    if (!end) {
      alert("Enter destination");
      return;
    }
 
    let startLat, startLng;
 
    if (start !== "") {
      let response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(start)}`
      );
      let data = await response.json();
      if (data.length === 0) {
        alert("Start location not found");
        return;
      }
      startLat = parseFloat(data[0].lat);
      startLng = parseFloat(data[0].lon);
    } else {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      startLat = pos.coords.latitude;
      startLng = pos.coords.longitude;
    }
 
    let endResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(end)}`
    );
    let endData = await endResponse.json();
 
    if (endData.length === 0) {
      alert("Destination not found");
      return;
    }
 
    let endLat = parseFloat(endData[0].lat);
    let endLng = parseFloat(endData[0].lon);
 
    if (routingControl) map.removeControl(routingControl);
 
    routingControl = L.Routing.control({
      waypoints: [L.latLng(startLat, startLng), L.latLng(endLat, endLng)],
      routeWhileDragging: false,
      lineOptions: {
        styles: [
          { color: "#00ffff", weight: 10, opacity: 0.9 },
          { color: "#38bdf8", weight: 5 }
        ]
      }
    }).addTo(map);
 
    routeInstructions = [];
    routingControl.on("routesfound", function (e) {
      routeInstructions = e.routes[0].instructions;
    });
 
    vehicleMarker.setLatLng([startLat, startLng]);
    map.setView([startLat, startLng], 14);
 
    setTimeout(() => map.invalidateSize(), 500);
 
    getTrafficData(startLat, startLng);
 
    document.getElementById("map").scrollIntoView({ behavior: "smooth" });
 
  } catch (error) {
    console.log(error);
    alert("Route Error");
  }
}
 
// =========================
// START TRIP TRACKING
// =========================
 
async function startRealTracking() {
  tripStarted = true;
 
  await requestStorageAccess();
  startCamera();
 
  document.getElementById("tripStatus").innerText = "TRIP STARTED";
  document.getElementById("tripStatus").style.color = "#22c55e";
 
  if (watchId) navigator.geolocation.clearWatch(watchId);
 
  let customStart = document.getElementById("startLocation").value.trim();
 
  // Custom location mode (no real GPS movement)
  if (customStart !== "") {
    try {
      let response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(customStart)}`
      );
      let data = await response.json();
 
      if (data.length === 0) {
        alert("Location not found");
        return;
      }
 
      let lat = parseFloat(data[0].lat);
      let lng = parseFloat(data[0].lon);
 
      vehicleMarker.setLatLng([lat, lng]);
      map.flyTo([lat, lng], 17, { animate: true, duration: 1.5 });
 
      if (routingControl) {
        let destination = routingControl.getWaypoints()[1];
        if (destination && destination.latLng) {
          routingControl.setWaypoints([L.latLng(lat, lng), destination.latLng]);
        }
      }
 
      getTrafficData(lat, lng);
      getWeather(lat, lng);
 
      document.getElementById("currentSpeed").innerText = "0";
      if (gauge) {
        gauge.data.datasets[0].data = [0, 180];
        gauge.update();
      }
 
      tripData.push({ lat, lng, speed: 0, time: new Date().toLocaleTimeString() });
      return;
 
    } catch (error) {
      console.log(error);
    }
  }
 
  // Real GPS mode
  watchId = navigator.geolocation.watchPosition(
    function (position) {
      let lat = position.coords.latitude;
      let lng = position.coords.longitude;
 
      // Turn-by-turn voice navigation
      if (routeInstructions && routeInstructions.length > 0) {
        routeInstructions.forEach(step => {
          if (step.distance && step.distance < 100 && !step.spoken) {
            speak(step.text);
            let txt = step.text.toLowerCase();
            document.getElementById("turnArrow").innerText =
              txt.includes("left") ? "⬅️" : txt.includes("right") ? "➡️" : "⬆️";
            document.getElementById("turnText").innerText = step.text;
            step.spoken = true;
          }
        });
      }
 
      vehicleMarker.setLatLng([lat, lng]);
      map.setView([lat, lng], 15);
 
      let speed = position.coords.speed;
      speed = (speed === null || speed === undefined) ? 0 : Math.round(speed * 3.6);
 
      document.getElementById("currentSpeed").innerText = speed;
 
      if (gauge) {
        gauge.data.datasets[0].data = [speed, 180 - speed];
        gauge.update();
      }
 
      // Brake / Accelerate detection
      if (speed > previousSpeed) {
        totalAccelEvents++;
        accelData.push(speed);
        brakeData.push(0);
      } else if (speed < previousSpeed) {
        totalBrakeEvents++;
        brakeData.push(speed);
        accelData.push(0);
      }
 
      document.getElementById("totalBrake").innerText = totalBrakeEvents;
      document.getElementById("totalAccel").innerText = totalAccelEvents;
 
      labels.push(new Date().toLocaleTimeString());
      if (labels.length > 15) {
        labels.shift();
        brakeData.shift();
        accelData.shift();
      }
 
      if (liveChart) liveChart.update();
 
      previousSpeed = speed;
      updateSafetyScore();
 
      tripData.push({ lat, lng, speed, time: new Date().toLocaleTimeString() });
 
      getTrafficData(lat, lng);
      getWeather(lat, lng);
    },
    function (error) {
      console.log(error);
      alert("Allow GPS permission");
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}
 
// =========================
// STOP TRIP
// =========================
 
function stopTrip() {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
 
  let allTrips = JSON.parse(localStorage.getItem("tripHistory")) || [];
  allTrips.push(tripData);
  localStorage.setItem("tripHistory", JSON.stringify(allTrips));
 
  tripStarted = false;
  tripData = [];
 
  document.getElementById("tripStatus").innerText = "TRIP ENDED";
  document.getElementById("tripStatus").style.color = "#ef4444";
}
 
// =========================
// DOWNLOAD PDF REPORT
// =========================
 
async function downloadTripReport() {
  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
 
    pdf.setFontSize(22);
    pdf.text("Fleet AI Report", 20, 20);
 
    pdf.setFontSize(12);
    pdf.text("Trip Points: " + tripData.length, 20, 40);
    pdf.text("Brake Events: " + totalBrakeEvents, 20, 55);
    pdf.text("Acceleration Events: " + totalAccelEvents, 20, 70);
    pdf.text("Generated: " + new Date().toLocaleString(), 20, 85);
 
    map.invalidateSize();
    await new Promise(resolve => setTimeout(resolve, 3000));
    map.panBy([1, 1]);
    map.panBy([-1, -1]);
    await new Promise(resolve => setTimeout(resolve, 1000));
 
    const canvas = await html2canvas(document.getElementById("map"), {
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      scale: 2
    });
 
    const image = canvas.toDataURL("image/png");
    pdf.addImage(image, "PNG", 10, 100, 190, 95);
    pdf.save("fleet_report.pdf");
 
  } catch (error) {
    console.log(error);
    alert("PDF generation failed");
  }
}
 
// =========================
// TRAFFIC API
// =========================
 
async function getTrafficData(lat, lng) {
  let trafficLevel = document.getElementById("trafficLevel");
  let trafficDelay = document.getElementById("trafficDelay");
 
  if (trafficLevel) trafficLevel.innerText = "Loading...";
 
  try {
    const apiKey = "18tEsbkhPAl9eB59hMx6V7QDPfH5QNXC";
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lng}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
 
    if (!data || !data.flowSegmentData) {
      trafficLevel.innerText = "Low";
      trafficDelay.innerText = "0 mins";
      return;
    }
 
    let currentSpeed = data.flowSegmentData.currentSpeed || 0;
    let freeFlowSpeed = data.flowSegmentData.freeFlowSpeed || 0;
    let delay = Math.max(0, freeFlowSpeed - currentSpeed);
 
    let traffic = "Low";
    let color = "green";
 
    if (delay > 20) { traffic = "High"; color = "red"; }
    else if (delay > 10) { traffic = "Moderate"; color = "orange"; }
 
    trafficLevel.innerText = traffic;
    trafficDelay.innerText = delay + " mins";
 
    if (trafficCircle) map.removeLayer(trafficCircle);
    trafficCircle = L.circle([lat, lng], {
      radius: 300,
      color: color,
      fillColor: color,
      fillOpacity: 0.35
    }).addTo(map);
 
  } catch (error) {
    console.log("Traffic Error:", error);
    trafficLevel.innerText = "Low";
    trafficDelay.innerText = "0 mins";
  }
}
 
// =========================
// WEATHER API
// =========================
 
async function getWeather(lat, lng) {
  try {
    const apiKey = "abcd025b875b6e22fcf6b7c846188305";
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${apiKey}`
    );
    const data = await response.json();
    document.getElementById("weatherCondition").innerText = data.weather[0].main;
    document.getElementById("weatherTemp").innerText = Math.round(data.main.temp);
  } catch (error) {
    console.log(error);
    document.getElementById("weatherCondition").innerText = "Unavailable";
  }
}
 
// =========================
// LOAD DATA (DB TABLE)
// =========================
 
function loadData() {
  fetch(`${API_BASE}/data`)
    .then(res => res.json())
    .then(data => {
      let table = document.getElementById("dataTable");
      if (table) {
        table.innerHTML = "";
        data.forEach(item => {
          table.innerHTML += `
            <tr>
              <td>${item.id}</td>
              <td>${item.speed}</td>
              <td>${item.distance}</td>
              <td>${item.weather}</td>
              <td>${item.action}</td>
              <td><button onclick="deleteData(${item.id})">Delete</button></td>
            </tr>
          `;
        });
      }
 
      let tripCount = document.getElementById("tripCount");
      if (tripCount) tripCount.innerText = data.length;
 
      drawAnalytics(data);
 
      let brakeCount = data.filter(d => d.action == 0).length;
      let accelCount = data.filter(d => d.action == 1).length;
      drawDecisionChart(brakeCount, accelCount);
    })
    .catch(err => console.log(err));
}
 
// =========================
// ADD DATA
// =========================
 
function addData() {
  let speed    = document.getElementById("newSpeed").value;
  let distance = document.getElementById("newDistance").value;
  let weather  = document.getElementById("newWeather").value;
  let action   = document.getElementById("newAction").value;
 
  fetch(`${API_BASE}/add_data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ speed, distance, weather, action })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || "Data Added");
      loadData();
    });
}
 
// =========================
// DELETE DATA
// =========================
 
function deleteData(id) {
  fetch(`${API_BASE}/delete/${id}`, { method: "DELETE" })
    .then(res => res.json())
    .then(data => {
      alert(data.message || "Deleted");
      loadData();
    });
}
 
// =========================
// SEARCH TABLE
// =========================
 
function searchTable() {
  let input = document.getElementById("searchInput");
  if (!input) return;
  let filter = input.value.toUpperCase();
  let rows = document.getElementById("dataTable").getElementsByTagName("tr");
  for (let i = 0; i < rows.length; i++) {
    let td = rows[i].getElementsByTagName("td")[0];
    if (td) {
      rows[i].style.display =
        td.textContent.toUpperCase().indexOf(filter) > -1 ? "" : "none";
    }
  }
}
 
// =========================
// ANALYTICS CHART
// =========================
 
function drawAnalytics(data) {
  const canvas = document.getElementById("analyticsChart");
  if (!canvas) return;
  if (analyticsChart) analyticsChart.destroy();
  analyticsChart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: data.map(d => d.id),
      datasets: [{ label: "Speed", data: data.map(d => d.speed), borderColor: "#3b82f6", fill: false }]
    }
  });
}
 
// =========================
// DECISION PIE CHART
// =========================
 
function drawDecisionChart(brakeCount, accelCount) {
  const canvas = document.getElementById("decisionChart");
  if (!canvas) return;
  if (decisionChart) decisionChart.destroy();
  decisionChart = new Chart(canvas.getContext("2d"), {
    type: "pie",
    data: {
      labels: ["Brake", "Accelerate"],
      datasets: [{ data: [brakeCount, accelCount], backgroundColor: ["#ef4444", "#22c55e"] }]
    }
  });
}
 
// =========================
// AI ASSISTANT
// =========================
 
function askAI() {
  let question = document.getElementById("aiQuestion").value;
  if (!question) { alert("Enter question"); return; }
 
  let q = question.toLowerCase();
 
  // Local commands
  if (q.includes("zoom in"))      { map.zoomIn(); return; }
  if (q.includes("zoom out"))     { map.zoomOut(); return; }
  if (q.includes("show traffic")) { let pos = vehicleMarker.getLatLng(); getTrafficData(pos.lat, pos.lng); return; }
  if (q.includes("navigate home")) { document.getElementById("endLocation").value = "Home"; findRoute(); return; }
  if (q.includes("am i safe")) {
    document.getElementById("aiResponse").innerText =
      "Safety score: " + document.getElementById("safetyScore").innerText;
    return;
  }
 
  document.getElementById("aiResponse").innerText = "Thinking...";
 
  fetch(`${API_BASE}/ai_assistant?question=${encodeURIComponent(question)}`)
    .then(res => res.json())
    .then(data => {
      document.getElementById("aiResponse").innerText = data.response || "No Response";
    })
    .catch(err => {
      console.log(err);
      document.getElementById("aiResponse").innerText = "AI Server Error";
    });
}
 
// =========================
// VOICE COMMAND
// =========================
 
function startVoice() {
  if (!("webkitSpeechRecognition" in window)) {
    alert("Voice recognition not supported in this browser");
    return;
  }
 
  const recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.start();
 
  document.getElementById("aiResponse").innerText = "🎤 Listening... Speak now";
 
  recognition.onresult = function (event) {
    let text = event.results[0][0].transcript;
    document.getElementById("aiQuestion").value = text;
    document.getElementById("aiResponse").innerText = "You said: " + text;
 
    if (text.toLowerCase().includes("start trip")) { startRealTracking(); return; }
    if (text.toLowerCase().includes("stop trip"))  { stopTrip(); return; }
    if (text.toLowerCase().includes("find route")) { findRoute(); return; }
 
    askAI();
  };
 
  recognition.onerror = function () {
    document.getElementById("aiResponse").innerText = "Microphone Error";
  };
}
 
// =========================
// TEXT-TO-SPEECH
// =========================
 
function speak(text) {
  let mode = document.getElementById("voiceMode").value;
  if (mode === "none") return;
 
  const speech = new SpeechSynthesisUtterance(text);
  let voices = speechSynthesis.getVoices();
 
  if (mode === "female") speech.voice = voices.find(v => v.name.toLowerCase().includes("female")) || voices[0];
  if (mode === "male")   speech.voice = voices.find(v => v.name.toLowerCase().includes("male"))   || voices[0];
 
  speech.rate = 1;
  speechSynthesis.speak(speech);
}
 
// =========================
// LOGOUT
// =========================
 
function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}
 
// =========================
// CAMERA START
// =========================
 
async function startCamera() {
  try {
    roadStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
 
    driverStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });
 
    document.getElementById("roadCam").srcObject   = roadStream;
    document.getElementById("driverCam").srcObject = driverStream;
 
    await loadFaceModels();
    await loadObjects();
 
    setTimeout(() => {
      if (!detectionRunning) {
        startEyeDetection();
        startEmotionDetection();
        startDashcam();
        detectionRunning = true;
      }
    }, 3000);
 
  } catch (error) {
    console.log(error);
    alert("Camera unavailable");
  }
}
 
// =========================
// LOAD FACE API MODELS
// =========================
 
async function loadFaceModels() {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri("https://justadudewhohacks.github.io/face-api.js/models"),
    faceapi.nets.faceLandmark68Net.loadFromUri("https://justadudewhohacks.github.io/face-api.js/models"),
    faceapi.nets.faceExpressionNet.loadFromUri("https://justadudewhohacks.github.io/face-api.js/models")
  ]);
  console.log("Face Models Loaded");
}
 
// =========================
// EYE ASPECT RATIO HELPERS
// =========================
 
function distance(a, b) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}
 
function eyeAspectRatio(eye) {
  let A = distance(eye[1], eye[5]);
  let B = distance(eye[2], eye[4]);
  let C = distance(eye[0], eye[3]);
  return (A + B) / (2 * C);
}
 
// =========================
// EYE / DROWSINESS DETECTION
// =========================
 
function startEyeDetection() {
  setInterval(async () => {
    let cam = document.getElementById("driverCam");
    if (!cam) return;
 
    const detection = await faceapi
      .detectSingleFace(cam, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();
 
    if (!detection) { eyeClosedStart = null; return; }
 
    let leftEAR  = eyeAspectRatio(detection.landmarks.getLeftEye());
    let rightEAR = eyeAspectRatio(detection.landmarks.getRightEye());
    let avgEAR   = (leftEAR + rightEAR) / 2;
 
    if (avgEAR < 0.27) {
      if (!eyeClosedStart) eyeClosedStart = Date.now();
      if (Date.now() - eyeClosedStart > 5000 && !drowsyTriggered) {
        document.getElementById("drowsyAlert").style.display = "block";
        document.getElementById("alarm").play();
        speak("Driver is drowsy");
        drowsyTriggered = true;
      }
    } else {
      eyeClosedStart = null;
      drowsyTriggered = false;
      document.getElementById("drowsyAlert").style.display = "none";
      let alarm = document.getElementById("alarm");
      if (alarm) { alarm.pause(); alarm.currentTime = 0; }
    }
  }, 300);
}
 
// =========================
// EMOTION DETECTION
// =========================
 
function startEmotionDetection() {
  setInterval(async () => {
    let cam = document.getElementById("driverCam");
    if (!cam || cam.readyState !== 4) return;
 
    try {
      const result = await faceapi
        .detectSingleFace(cam, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();
 
      if (!result) {
        document.getElementById("emotion").innerText = "Emotion: No Face";
        return;
      }
 
      let expressions = result.expressions;
      let emotion = Object.keys(expressions).reduce((a, b) =>
        expressions[a] > expressions[b] ? a : b
      );
 
      document.getElementById("emotion").innerText = "Emotion: " + emotion;
 
    } catch (error) {
      console.log("Emotion Error", error);
    }
  }, 2000);
}
 
// =========================
// OBJECT DETECTION (COCO-SSD)
// =========================
 
async function loadObjects() {
  try {
    model = await cocoSsd.load();
    if (!objectInterval) {
      objectInterval = setInterval(detectObjects, 2000);
    }
  } catch (error) {
    console.log("Model Error", error);
  }
}
 
async function detectObjects() {
  const cam = document.getElementById("driverCam");
  if (!cam || !model || cam.readyState !== 4) return;
 
  const predictions = await model.detect(cam);
 
  if (predictions.length === 0) {
    document.getElementById("objectDetect").innerText = "Objects: None";
    return;
  }
 
  let names = predictions.map(p => p.class);
  document.getElementById("objectDetect").innerText = "Objects: " + names.join(", ");
  document.getElementById("trafficSign").innerText = names.includes("stop sign") ? "STOP Sign" : "None";
}
 
// =========================
// LANE DETECTION (Server)
// =========================
 
async function detectLane() {
  const cam = document.getElementById("driverCam");
  if (!cam) return;
 
  const canvas = document.createElement("canvas");
  canvas.width  = cam.videoWidth;
  canvas.height = cam.videoHeight;
  canvas.getContext("2d").drawImage(cam, 0, 0);
 
  canvas.toBlob(async (blob) => {
    let form = new FormData();
    form.append("frame", blob);
    const response = await fetch(`${API_BASE}/detect_lane`, { method: "POST", body: form });
    const data = await response.json();
    document.getElementById("laneStatus").innerText = "Lane: " + data.lane;
  });
}
 
// =========================
// ROAD SEGMENTATION (Server)
// =========================
 
async function detectRoad() {
  const cam = document.getElementById("driverCam");
  if (!cam) return;
 
  const canvas = document.createElement("canvas");
  canvas.width  = cam.videoWidth;
  canvas.height = cam.videoHeight;
  canvas.getContext("2d").drawImage(cam, 0, 0);
 
  canvas.toBlob(async (blob) => {
    let form = new FormData();
    form.append("frame", blob);
    const response = await fetch(`${API_BASE}/road_segment`, { method: "POST", body: form });
    const data = await response.json();
    document.getElementById("roadStatus").innerText = "Road: " + data.road;
  });
}
 
// =========================
// INDEXEDDB INIT
// =========================
 
function initDB() {
  const request = indexedDB.open("DashcamDB", 1);
 
  request.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("videos", { autoIncrement: true });
  };
 
  request.onsuccess = (e) => {
    db = e.target.result;
    console.log("Dashcam Storage Ready");
  };
}
 
// =========================
// DASHCAM DUAL RECORDING
// =========================
 
function startDashcam() {
  const road   = document.getElementById("roadCam");
  const driver = document.getElementById("driverCam");
 
  const canvas = document.createElement("canvas");
  canvas.width  = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
 
  setInterval(() => {
    ctx.drawImage(road,   0,   0, 960, 720);
    ctx.drawImage(driver, 980, 20, 280, 180);
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText(new Date().toLocaleString(), 20, 30);
  }, 100);
 
  const stream = canvas.captureStream(30);
  recorder = new MediaRecorder(stream);
 
  recorder.ondataavailable = (e) => chunks.push(e.data);
 
  recorder.onstop = () => {
    let blob = new Blob(chunks, { type: "video/webm" });
    chunks = [];
    saveLoopVideo(blob);
  };
 
  setInterval(() => {
    recorder.start();
    setTimeout(() => recorder.stop(), 60000);
  }, 61000);
}
 
// =========================
// REQUEST STORAGE ACCESS
// =========================
 
async function requestStorageAccess() {
  try {
    saveDirectory = await window.showDirectoryPicker();
  } catch (e) {
    console.log("Storage access denied or not supported", e);
  }
}
 
// =========================
// SAVE LOOP VIDEO
// =========================
 
async function saveLoopVideo(blob) {
  if (!saveDirectory) return;
 
  const fileName = "dashcam_" + Date.now() + ".webm";
  const fileHandle = await saveDirectory.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
  console.log("Saved:", fileName);
}