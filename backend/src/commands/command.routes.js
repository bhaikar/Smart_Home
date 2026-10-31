import { Router } from "express";
import { commandService } from "./command.service.js";
import { deviceService } from "../devices/device.service.js";
import { eventService } from "../events/event.service.js";
import { aiService } from "../ai/ai.service.js";

export function createCommandRouter({ commands = commandService, devices = deviceService, events = eventService, publisher = null, ai = aiService } = {}) {
  const router = Router();

  router.get("/dashboard", (_request, response) => {
    response.json({
      ...devices.getSnapshot(),
      commands: commands.list(),
      events: events.list()
    });
  });

  router.get("/devices", (_request, response) => {
    response.json({ devices: devices.list() });
  });

  router.get("/devices/:id/status", (request, response) => {
    const device = devices.getDevice(request.params.id);
    if (!device) return response.status(404).json({ error: "Device not found" });
    return response.json(device);
  });

  router.get("/devices/:id/history", (request, response) => {
    const device = devices.getDevice(request.params.id);
    if (!device) return response.status(404).json({ error: "Device not found" });
    return response.json({ events: events.list().filter((event) => event.deviceId === request.params.id) });
  });

  router.post("/commands", async (request, response, next) => {
    try {
      const command = commands.create(request.body);
      if (!publisher) return response.status(201).json(command);
      const published = await publisher(command);
      return response.status(201).json(published ?? commands.get(command.id));
    } catch (error) {
      error.status = error.status ?? 503;
      return next(error);
    }
  });

  router.get("/commands/:id", (request, response) => {
    const command = commands.get(request.params.id);
    if (!command) return response.status(404).json({ error: "Command not found" });
    return response.json(command);
  });

  router.post("/ai/command", async (request, response, next) => {
    try {
      const result = await ai.interpret(request.body?.message);
      return response.json(result);
    } catch (error) {
      return next(error);
    }
  });

  router.get("/events", (request, response) => {
    const limit = request.query.limit === undefined ? undefined : Number(request.query.limit);
    return response.json({ events: events.list(Number.isFinite(limit) ? limit : undefined) });
  });

  return router;
}

export const commandRouter = createCommandRouter();
