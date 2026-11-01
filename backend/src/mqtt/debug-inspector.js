import { messageSchema, availabilitySchema, topics } from "./contract.js";

const CAP = 100;

function truncate(value) {
  return value.toString().slice(0, 1024);
}

function schemaFor(topic) {
  return topic === topics.masterAvailability ? availabilitySchema : messageSchema;
}

export function createMqttInspector({ enabled = process.env.NODE_ENV !== "production", capacity = CAP } = {}) {
  const messages = [];

  function record({ topic, payload, handler }) {
    if (!enabled) return;
    const rawPayload = truncate(payload);
    let parsed;
    let parsedOk = false;
    let validationErrors = [];
    try {
      parsed = JSON.parse(payload.toString());
    } catch (error) {
      validationErrors = [{ path: [], message: error.message, code: "invalid_json" }];
    }
    if (parsed !== undefined) {
      const result = schemaFor(topic).safeParse(parsed);
      parsedOk = result.success;
      if (!result.success) validationErrors = result.error.issues.map(({ path, message, code }) => ({ path, message, code }));
    }
    messages.unshift({ topic, receivedAt: new Date().toISOString(), rawPayload, parsedOk, validationErrors, handler });
    if (messages.length > capacity) messages.length = capacity;
  }

  return { record, list: () => structuredClone(messages), clear: () => { messages.length = 0; } };
}

export const mqttInspector = createMqttInspector();
