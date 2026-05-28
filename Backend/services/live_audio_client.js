const WEBSOCKET_URL = "ws://localhost:8000/ws/live-audio";

let ws = null;
let mediaRecorder = null;
let stream = null;

async function startLiveSession() {
  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      sampleRate: 16000,
      echoCancellation: true,
      noiseSuppression: true,
    },
  });

  ws = new WebSocket(WEBSOCKET_URL);
  ws.binaryType = "arraybuffer";

  ws.onopen = function () {
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = function (event) {
      if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
        ws.send(event.data);
      }
    };

    mediaRecorder.start(2000);
  };

  ws.onmessage = function (event) {
    const data = JSON.parse(event.data);
    if (data.transcript) {
      console.log("Transcript:", data.transcript);
    }
    if (data.error) {
      console.error("Error:", data.error);
    }
  };

  ws.onerror = function (err) {
    console.error("WebSocket error:", err);
  };

  ws.onclose = function () {
    console.log("Session closed");
  };
}

function stopLiveSession() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }

  if (stream) {
    stream.getTracks().forEach(function (track) {
      track.stop();
    });
  }

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send("STOP");
  }
}