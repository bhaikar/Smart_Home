import express from "express";
import cors from "cors";
import { config } from "./config/index.js";
import { createCommandRouter } from "./commands/command.routes.js";
import { mqttClient } from "./mqtt/client.js";
import { createAiService } from "./ai/ai.service.js";
import { deviceService } from "./devices/device.service.js";
import { eventService } from "./events/event.service.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.FRONTEND_URL }));
  app.use(express.json());
  const configuredAiService = createAiService({ devices: deviceService, events: eventService });
  app.use("/api", createCommandRouter({ publisher: mqttClient.publishCommand, ai: configuredAiService, devices: deviceService, events: eventService }));

  app.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      mqtt: {
        connected: mqttClient.getConnectionState() === "ONLINE",
        lastMessageAt: mqttClient.getLastMessageAt() ?? null
      }
    });
  });

  app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(error.status ?? 500).json({
      error: error.message ?? "Internal server error"
    });
  });

  return app;
}

export const app = createApp();
