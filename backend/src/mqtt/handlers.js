import { messageSchema, availabilitySchema } from "./contract.js";
import { deviceService } from "../devices/device.service.js";
import { commandService } from "../commands/command.service.js";
import { eventService } from "../events/event.service.js";

function parseMessage(raw, schema = messageSchema) {
  let value;
  try {
    value = JSON.parse(raw.toString());
  } catch (error) {
    console.warn("Dropping invalid MQTT JSON message", error.message);
    return null;
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    console.warn("Dropping invalid MQTT message", parsed.error.issues);
    return null;
  }
  return parsed.data;
}

function isFailedResult(message) {
  return message.result === "FAILED" || message.status === "FAILED" || message.success === false;
}

export function createMqttHandlers({ devices = deviceService, commands = commandService, events = eventService } = {}) {
  function handleResult(raw) {
    const message = parseMessage(raw);
    if (!message || !["ACK", "FAILED"].includes(message.messageType) || !message.commandId) return null;
    if (message.messageType === "ACK") return commands.handleAck(message);
    if (isFailedResult(message)) return commands.handleResult({ ...message, success: false });
    return null;
  }

  function handleStatus(raw) {
    const message = parseMessage(raw);
    if (!message || message.messageType !== "STATUS" || !message.slaveId) return null;
    const updated = devices.updateStatus({
      id: message.slaveId,
      device: message.device,
      state: message.state ?? {},
      reportedAt: new Date()
    });
    if (message.commandId) commands.handleStatus(message);
    return updated;
  }

  function handleEvent(raw) {
    const message = parseMessage(raw);
    if (!message || message.messageType !== "EVENT") return null;
    return events.addEvent({
      type: message.device ?? "DEVICE_EVENT",
      message: message.message ?? "Device event received",
      deviceId: message.slaveId,
      data: message.data ?? message.state
    });
  }

  function handleAvailability(raw) {
    const message = parseMessage(raw, availabilitySchema);
    if (!message) return null;
    if (message.slaveId) return devices.markAvailability(message.slaveId, message.status);
    return devices.updateMasterAvailability(message.status);
  }

  return { handleResult, handleStatus, handleEvent, handleAvailability, parseMessage };
}

export const mqttHandlers = createMqttHandlers();
export const { handleResult, handleStatus, handleEvent, handleAvailability } = mqttHandlers;
export { parseMessage };
