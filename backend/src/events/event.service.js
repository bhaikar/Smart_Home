import { randomUUID } from "node:crypto";
import { EVENT_CAP } from "../config/index.js";
import { emitDeviceEvent } from "../sockets/socket.js";

export function createEventService({ cap = EVENT_CAP } = {}) {
  // This history is intentionally in memory only and is not persisted.
  const events = [];

  function addEvent(event) {
    const record = {
      id: event.id ?? `event_${randomUUID()}`,
      type: event.type,
      message: event.message ?? event.type,
      ...(event.deviceId ? { deviceId: event.deviceId } : {}),
      createdAt: event.createdAt ?? new Date().toISOString(),
      ...(event.data ? { data: event.data } : {})
    };
    events.unshift(record);
    if (events.length > cap) events.length = cap;
    emitDeviceEvent(structuredClone(record));
    return structuredClone(record);
  }

  return {
    addEvent,
    list(limit = cap) {
      return structuredClone(events.slice(0, Math.max(0, limit)));
    },
    clear() {
      events.length = 0;
    }
  };
}

export const eventService = createEventService();
export const { addEvent, list } = eventService;
