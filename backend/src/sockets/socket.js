let io;
let getSnapshot = () => ({});

export function initSocket(socketServer, snapshotProvider = () => ({})) {
  io = socketServer;
  getSnapshot = snapshotProvider;

  io.on("connection", (socket) => {
    socket.emit("snapshot", getSnapshot());
  });

  return io;
}

function emit(event, payload) {
  if (io) io.emit(event, payload);
}

export function emitDeviceStatus(payload) {
  emit("device:status", payload);
}

export function emitDeviceAvailability(payload) {
  emit("device:availability", payload);
}

export function emitDeviceEvent(payload) {
  emit("device:event", payload);
}

export function emitCommandUpdated(payload) {
  emit("command:updated", payload);
}

export function emitMasterStatus(payload) {
  emit("master:status", payload);
}
