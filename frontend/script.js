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

// Hidden canvas for face-api to read from
let faceCanvas = null;
let faceCtx    = null;

// =========================
// WINDOW LOAD
// =========================

window.onload = function () {

  let hour = new Date().getHours();
  if (hour >= 18 || hour <= 6) {
    document.body.style.filter = "brightness(0.8) contrast(1.3)";
  }

  initDB();
  initializeMap();
  initializeCharts();
  createGauge();
  loadData();

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

  let endInput = document.getElementById("endLocation");
  if (endInput) {
    endInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") findRoute();
    });
  }

  setTimeout(() => { if (map) map.invalidateSize(); }, 1000);
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

  setTimeout(() => { map.invalidateSize(); }, 500);

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
          { label: "Brake",      data: brakeData, borderColor: "#ef4444", fill: false },
          { label: "Accelerate", data: accelData, borderColor: "#22c55e", fill: false }
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
      datasets: [{ data: [0, 180], backgroundColor: ["#22c55e", "#1e293b"] }]
    },
    options: {
      cutout: "75%",
      plugins: { legend: { display: false } }
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
    let end   = document.getElementById("endLocation").value.trim();

    if (!end) { alert("Enter destination"); return; }

    let startLat, startLng;

    if (start !== "") {
      let response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(start)}`
      );
      let data = await response.json();
      if (data.length === 0) { alert("Start location not found"); return; }
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
    if (endData.length === 0) { alert("Destination not found"); return; }

    let endLat = parseFloat(endData[0].lat);
    let endLng = parseFloat(endData[0].lon);

    if (routingControl) map.removeControl(routingControl);

    routingControl = L.Routing.control({
      waypoints: [L.latLng(startLat, startLng), L.latLng(endLat, endLng)],
      routeWhileDragging: false,
      show: false,
      collapsible: true,
      lineOptions: {
        styles: [
          { color: "#00ffff", weight: 10, opacity: 0.9 },
          { color: "#38bdf8", weight: 5 }
        ]
      }
    }).addTo(map);

    setTimeout(() => {
      let panel = document.querySelector(".leaflet-routing-container");
      if (panel) panel.style.display = "none";
    }, 1000);

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
  startCamera();

  document.getElementById("tripStatus").innerText = "TRIP STARTED";
  document.getElementById("tripStatus").style.color = "#22c55e";

  if (watchId) navigator.geolocation.clearWatch(watchId);

  let customStart = document.getElementById("startLocation").value.trim();

  if (customStart !== "") {
    try {
      let response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(customStart)}`
      );
      let data = await response.json();
      if (data.length === 0) { alert("Location not found"); return; }

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
      if (gauge) { gauge.data.datasets[0].data = [0, 180]; gauge.update(); }

      tripData.push({ lat, lng, speed: 0, time: new Date().toLocaleTimeString() });
      return;

    } catch (error) { console.log(error); }
  }

  watchId = navigator.geolocation.watchPosition(
    function (position) {
      let lat = position.coords.latitude;
      let lng = position.coords.longitude;

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

      if (gauge) { gauge.data.datasets[0].data = [speed, 180 - speed]; gauge.update(); }

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
      if (labels.length > 15) { labels.shift(); brakeData.shift(); accelData.shift(); }
      if (liveChart) liveChart.update();

      previousSpeed = speed;
      updateSafetyScore();

      tripData.push({ lat, lng, speed, time: new Date().toLocaleTimeString() });

      getTrafficData(lat, lng);
      getWeather(lat, lng);
    },
    function (error) { console.log(error); alert("Allow GPS permission"); },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

// =========================
// STOP TRIP
// =========================

function stopTrip() {
  if (watchId) { navigator.geolocation.clearWatch(watchId); watchId = null; }

  let allTrips = JSON.parse(localStorage.getItem("tripHistory")) || [];
  allTrips.push(tripData);
  localStorage.setItem("tripHistory", JSON.stringify(allTrips));

  // Stop recorder first, cameras stop inside onstop
  if (recorder && recorder.state === "recording") {
    recorder.stop();
  } else {
    stopCameras();
  }

  detectionRunning = false;
  tripStarted = false;
  tripData = [];

  document.getElementById("tripStatus").innerText = "TRIP ENDED";
  document.getElementById("tripStatus").style.color = "#ef4444";
}

// =========================
// STOP CAMERAS
// =========================

function stopCameras() {
  if (roadStream) {
    roadStream.getTracks().forEach(t => t.stop());
    roadStream = null;
    const v = document.getElementById("roadCam");
    if (v) v.srcObject = null;
  }
  if (driverStream) {
    driverStream.getTracks().forEach(t => t.stop());
    driverStream = null;
    const v = document.getElementById("driverCam");
    if (v) v.srcObject = null;
  }
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
    pdf.text("Trip Points: "         + tripData.length,   20, 40);
    pdf.text("Brake Events: "        + totalBrakeEvents,  20, 55);
    pdf.text("Acceleration Events: " + totalAccelEvents,  20, 70);
    pdf.text("Generated: "           + new Date().toLocaleString(), 20, 85);

    map.invalidateSize();
    await new Promise(resolve => setTimeout(resolve, 3000));
    map.panBy([1, 1]);
    map.panBy([-1, -1]);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const canvas = await html2canvas(document.getElementById("map"), {
      useCORS: true, allowTaint: true, backgroundColor: "#ffffff", scale: 2
    });

    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 100, 190, 95);
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
    const response = await fetch(
      `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lng}&key=${apiKey}`
    );
    const data = await response.json();

    if (!data || !data.flowSegmentData) {
      trafficLevel.innerText = "Low"; trafficDelay.innerText = "0 mins"; return;
    }

    let delay = Math.max(0,
      (data.flowSegmentData.freeFlowSpeed || 0) - (data.flowSegmentData.currentSpeed || 0)
    );
    let traffic = delay > 20 ? "High" : delay > 10 ? "Moderate" : "Low";
    let color   = delay > 20 ? "red"  : delay > 10 ? "orange"   : "green";

    trafficLevel.innerText = traffic;
    trafficDelay.innerText = delay + " mins";

    if (trafficCircle) map.removeLayer(trafficCircle);
    trafficCircle = L.circle([lat, lng], {
      radius: 300, color, fillColor: color, fillOpacity: 0.35
    }).addTo(map);

  } catch (error) {
    console.log("Traffic Error:", error);
    if (trafficLevel) trafficLevel.innerText = "Low";
    if (trafficDelay) trafficDelay.innerText = "0 mins";
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
    document.getElementById("weatherCondition").innerText = "Unavailable";
  }
}

// =========================
// LOAD DATA
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
            </tr>`;
        });
      }
      let tripCount = document.getElementById("tripCount");
      if (tripCount) tripCount.innerText = data.length;
      drawAnalytics(data);
      drawDecisionChart(
        data.filter(d => d.action == 0).length,
        data.filter(d => d.action == 1).length
      );
    })
    .catch(err => console.log(err));
}

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
    .then(data => { alert(data.message || "Data Added"); loadData(); });
}

function deleteData(id) {
  fetch(`${API_BASE}/delete/${id}`, { method: "DELETE" })
    .then(res => res.json())
    .then(data => { alert(data.message || "Deleted"); loadData(); });
}

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

  if (q.includes("zoom in"))       { map.zoomIn(); return; }
  if (q.includes("zoom out"))      { map.zoomOut(); return; }
  if (q.includes("show traffic"))  { let pos = vehicleMarker.getLatLng(); getTrafficData(pos.lat, pos.lng); return; }
  if (q.includes("navigate home")) { document.getElementById("endLocation").value = "Home"; findRoute(); return; }
  if (q.includes("am i safe"))     {
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
    .catch(() => {
      document.getElementById("aiResponse").innerText = "AI Server Error";
    });
}

function startVoice() {
  if (!("webkitSpeechRecognition" in window)) {
    alert("Voice recognition not supported"); return;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.start();

  document.getElementById("aiResponse").innerText = "🎤 Listening...";

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

function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// =========================
// CAMERA START
// =========================

async function startCamera() {
  try {
    try {
      roadStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: 640, height: 480 },
        audio: false
      });
      const roadCam = document.getElementById("roadCam");
      roadCam.srcObject = roadStream;
      await roadCam.play();
    } catch (e) { console.log("Back camera unavailable:", e); }

    try {
      driverStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 320, height: 240 },
        audio: false
      });
      const driverCam = document.getElementById("driverCam");
      driverCam.srcObject = driverStream;
      await driverCam.play();
    } catch (e) { console.log("Front camera unavailable:", e); }

    if (roadStream || driverStream) {
      startDashcam();
      detectionRunning = true;

      if (driverStream) {
        // Wait for video to be ready before loading models
        const driverCam = document.getElementById("driverCam");
        driverCam.onloadeddata = async () => {
          console.log("Driver cam ready, loading face models...");
          // Create offscreen canvas for face detection
          // FIX: on mobile, face-api can't read directly from <video>
          // We draw video frames to a canvas every 300ms and run detection on that
          faceCanvas = document.createElement("canvas");
          faceCanvas.width  = 320;
          faceCanvas.height = 240;
          faceCtx = faceCanvas.getContext("2d");

          try {
            await loadFaceModels();
            console.log("Face models ready ✅");
            startEyeDetection();
            startEmotionDetection();
          } catch (e) {
            console.log("Face model load failed:", e);
          }

          try {
            await loadObjects();
          } catch (e) {
            console.log("Object detection failed:", e);
          }
        };
      }
    } else {
      alert("No camera available");
    }
  } catch (error) {
    console.log("Camera error:", error);
  }
}

// =========================
// LOAD FACE API MODELS
// =========================

async function loadFaceModels() {
  const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
  ]);
}

// =========================
// DRAW VIDEO TO CANVAS
// FIX: mobile browsers won't let face-api read <video> directly
// We snapshot the video into a canvas every interval and detect on that
// =========================

function drawFrameToCanvas() {
  const cam = document.getElementById("driverCam");
  if (!cam || !faceCtx || cam.readyState < 2) return false;
  faceCtx.drawImage(cam, 0, 0, faceCanvas.width, faceCanvas.height);
  return true;
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
// EYE / DROWSINESS DETECTION  ← FIXED FOR MOBILE
// =========================

function startEyeDetection() {
  setInterval(async () => {
    if (!faceCanvas) return;
    if (!drawFrameToCanvas()) return;  // draw video → canvas first

    try {
      const detection = await faceapi
        .detectSingleFace(faceCanvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 160 }))
        .withFaceLandmarks();

      if (!detection) {
        eyeClosedStart = null;
        return;
      }

      let avgEAR = (
        eyeAspectRatio(detection.landmarks.getLeftEye()) +
        eyeAspectRatio(detection.landmarks.getRightEye())
      ) / 2;

      console.log("EAR:", avgEAR.toFixed(3)); // debug — remove later

      if (avgEAR < 0.27) {
        // Eyes closed
        if (!eyeClosedStart) eyeClosedStart = Date.now();

        const closedFor = Date.now() - eyeClosedStart;

        if (closedFor > 2000 && !drowsyTriggered) {
          // Reduced from 5s to 2s for better response
          drowsyTriggered = true;
          document.getElementById("drowsyAlert").style.display = "block";

          // FIX: on mobile, audio needs user interaction first
          // We use Web Audio API oscillator as fallback alarm
          playAlarm();

          // Text to speech
          if ("speechSynthesis" in window) {
            const msg = new SpeechSynthesisUtterance("Warning! Driver drowsy. Please stop.");
            msg.volume = 1;
            msg.rate   = 1;
            window.speechSynthesis.speak(msg);
          }
        }
      } else {
        // Eyes open
        eyeClosedStart  = null;
        drowsyTriggered = false;
        document.getElementById("drowsyAlert").style.display = "none";
        stopAlarm();
      }
    } catch (e) {
      console.log("Eye detection error:", e);
    }
  }, 300);
}

// =========================
// WEB AUDIO ALARM
// FIX: <audio> tag often blocked on mobile without user gesture
// Web Audio API works without prior interaction
// =========================

let audioCtx = null;
let alarmOscillator = null;

function playAlarm() {
  try {
    if (alarmOscillator) return; // already playing

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    alarmOscillator = audioCtx.createOscillator();
    const gainNode  = audioCtx.createGain();

    alarmOscillator.type      = "square";
    alarmOscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz alarm tone

    gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);

    alarmOscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    alarmOscillator.start();

    console.log("🔔 Alarm playing");
  } catch (e) {
    console.log("Alarm error:", e);
    // Fallback to HTML audio
    const alarm = document.getElementById("alarm");
    if (alarm) alarm.play().catch(() => {});
  }
}

function stopAlarm() {
  try {
    if (alarmOscillator) {
      alarmOscillator.stop();
      alarmOscillator.disconnect();
      alarmOscillator = null;
    }
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
  } catch (e) {}

  const alarm = document.getElementById("alarm");
  if (alarm) { alarm.pause(); alarm.currentTime = 0; }
}

// =========================
// EMOTION DETECTION  ← FIXED FOR MOBILE
// =========================

function startEmotionDetection() {
  setInterval(async () => {
    if (!faceCanvas) return;
    if (!drawFrameToCanvas()) return; // draw video → canvas first

    try {
      const result = await faceapi
        .detectSingleFace(faceCanvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 160 }))
        .withFaceLandmarks()
        .withFaceExpressions();

      if (!result) {
        document.getElementById("emotion").innerText = "Emotion: No Face";
        return;
      }

      const expressions = result.expressions;
      const emotion = Object.keys(expressions).reduce((a, b) =>
        expressions[a] > expressions[b] ? a : b
      );

      document.getElementById("emotion").innerText = "Emotion: " + emotion;
      console.log("Emotion detected:", emotion); // debug

    } catch (e) {
      console.log("Emotion error:", e);
    }
  }, 2000);
}

// =========================
// OBJECT DETECTION
// =========================

async function loadObjects() {
  try {
    model = await cocoSsd.load();
    if (!objectInterval) objectInterval = setInterval(detectObjects, 2000);
  } catch (error) { console.log("Model Error", error); }
}

async function detectObjects() {
  // FIX: use faceCanvas (offscreen canvas) instead of video element
  const source = faceCanvas || document.getElementById("driverCam");
  if (!source || !model) return;

  try {
    const predictions = await model.detect(source);
    let names = predictions.map(p => p.class);
    document.getElementById("objectDetect").innerText = "Objects: " + (names.join(", ") || "None");
    document.getElementById("trafficSign").innerText  = names.includes("stop sign") ? "STOP Sign" : "None";
  } catch (e) {
    console.log("Object detect error:", e);
  }
}

// =========================
// INDEXEDDB
// =========================

function initDB() {
  const request = indexedDB.open("DashcamDB", 1);
  request.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("videos", { autoIncrement: true });
  };
  request.onsuccess = (e) => {
    db = e.target.result;
  };
}

// =========================
// DASHCAM RECORDING  ← FIXED FOR MOBILE
// Saves video using IndexedDB + share sheet on Android
// =========================

function startDashcam() {
  const canvas = document.createElement("canvas");
  canvas.width  = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");

  setInterval(() => {
    const road   = document.getElementById("roadCam");
    const driver = document.getElementById("driverCam");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 1280, 720);
    if (road   && road.srcObject   && road.readyState   >= 2) ctx.drawImage(road,   0,   0, 960, 720);
    if (driver && driver.srcObject && driver.readyState >= 2) ctx.drawImage(driver, 980,  20, 280, 180);
    ctx.fillStyle = "white";
    ctx.font = "bold 18px Arial";
    ctx.fillText("🚗 Fleet AI  |  " + new Date().toLocaleString(), 16, 28);
  }, 100);

  const stream   = canvas.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
    ? "video/webm;codecs=vp8"
    : "video/webm";

  recorder = new MediaRecorder(stream, { mimeType });
  chunks   = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = async () => {
    if (chunks.length === 0) {
      alert("No video data recorded.");
      stopCameras();
      return;
    }

    const blob = new Blob(chunks, { type: "video/webm" });
    chunks = [];
    console.log("Video blob:", blob.size, "bytes");

    // FIX: On Android, use Web Share API to save to Gallery
    // This opens the native share/save dialog
    if (navigator.canShare && navigator.canShare({ files: [new File([blob], "dashcam.webm", { type: "video/webm" })] })) {
      try {
        const file = new File([blob], "dashcam_" + Date.now() + ".webm", { type: "video/webm" });
        await navigator.share({
          files: [file],
          title: "Fleet AI Dashcam",
          text: "Dashcam recording from Fleet AI"
        });
        console.log("Shared successfully ✅");
      } catch (e) {
        console.log("Share cancelled or failed:", e);
        // Fallback to download link
        triggerDownload(blob);
      }
    } else {
      // Fallback for desktop or unsupported browsers
      triggerDownload(blob);
    }

    stopCameras();
  };

  // Collect data every second
  recorder.start(1000);
  console.log("Dashcam recording started ✅");
}

// =========================
// TRIGGER DOWNLOAD (fallback)
// =========================

function triggerDownload(blob) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href    = url;
  a.download = "dashcam_" + Date.now() + ".webm";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 3000);
}

// =========================
// LANE + ROAD (server)
// =========================

async function detectLane() {
  const cam = document.getElementById("driverCam");
  if (!cam) return;
  const canvas = document.createElement("canvas");
  canvas.width = cam.videoWidth; canvas.height = cam.videoHeight;
  canvas.getContext("2d").drawImage(cam, 0, 0);
  canvas.toBlob(async (blob) => {
    let form = new FormData(); form.append("frame", blob);
    const data = await (await fetch(`${API_BASE}/detect_lane`, { method: "POST", body: form })).json();
    document.getElementById("laneStatus").innerText = "Lane: " + data.lane;
  });
}

async function detectRoad() {
  const cam = document.getElementById("driverCam");
  if (!cam) return;
  const canvas = document.createElement("canvas");
  canvas.width = cam.videoWidth; canvas.height = cam.videoHeight;
  canvas.getContext("2d").drawImage(cam, 0, 0);
  canvas.toBlob(async (blob) => {
    let form = new FormData(); form.append("frame", blob);
    const data = await (await fetch(`${API_BASE}/road_segment`, { method: "POST", body: form })).json();
    document.getElementById("roadStatus").innerText = "Road: " + data.road;
  });
}