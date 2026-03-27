let webSocketServer = null;

export function registerRealtimeServer(wss) {
  webSocketServer = wss;

  wss.on("connection", (socket) => {
    socket.send(
      JSON.stringify({
        type: "system.connected",
        payload: { message: "OMEGA FIT realtime connected" },
      }),
    );
  });
}

export function broadcastRealtime(type, payload) {
  if (!webSocketServer) {
    return;
  }

  const message = JSON.stringify({
    type,
    payload,
    timestamp: new Date().toISOString(),
  });

  for (const client of webSocketServer.clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}
