const WS_URL = "wss://willow-festivity-scavenger.ngrok-free.dev/ws/live-audio";

let socket = null;

// CONNECT TO WEBSOCKET
export function connectSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return socket;
  }

  socket = new WebSocket(WS_URL);
  socket.binaryType = "arraybuffer";

  socket.onopen = () => {
    console.log("WebSocket connected");
  };

  socket.onerror = (err) => {
    console.error("WebSocket error:", err);
  };

  socket.onclose = () => {
    console.log("WebSocket closed");
    socket = null;
  };

  return socket;
}

// SEND AUDIO CHUNK
export function sendAudioChunk(arrayBuffer) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(arrayBuffer);
  }
}

// SEND STOP SIGNAL
export function sendStop() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send("STOP");
  }
}

// CLOSE SOCKET
export function closeSocket() {
  if (socket) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send("STOP");
    }
    socket.close();
    socket = null;
  }
}

// GET SOCKET STATUS
export function getSocketStatus() {
  if (!socket) return "disconnected";
  switch (socket.readyState) {
    case WebSocket.CONNECTING: return "connecting";
    case WebSocket.OPEN:       return "connected";
    case WebSocket.CLOSING:    return "closing";
    case WebSocket.CLOSED:     return "disconnected";
    default:                   return "unknown";
  }
}