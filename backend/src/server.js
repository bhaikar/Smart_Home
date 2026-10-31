import http from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { app } from "./app.js";
import { config } from "./config/index.js";
import { initSocket } from "./sockets/socket.js";
import { deviceService } from "./devices/device.service.js";
import { commandService } from "./commands/command.service.js";
import { eventService } from "./events/event.service.js";
import { mqttClient } from "./mqtt/client.js";

const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: config.FRONTEND_URL }
});

initSocket(io, () => ({
  ...deviceService.getSnapshot(),
  commands: commandService.list(),
  events: eventService.list()
}));

httpServer.listen(config.PORT, () => {
  console.log(`HomeMate backend listening on port ${config.PORT}`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; shutting down`);
  deviceService.stop();
  mqttClient.close();
  io.close();
  httpServer.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
