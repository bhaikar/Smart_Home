import { STALE_AFTER_MS } from "../config/index.js";
import { emitDeviceAvailability, emitDeviceStatus, emitMasterStatus } from "../sockets/socket.js";

const initialDevices = {
  slave_1: { id: "slave_1", device: "door_security", availability: "UNKNOWN", state: {} },
  slave_2: { id: "slave_2", device: "water_pump", availability: "UNKNOWN", state: {} },
  slave_3: { id: "slave_3", device: "fan", availability: "UNKNOWN", state: {} },
  slave_4: { id: "slave_4", device: "reserved", availability: "NOT_CONFIGURED", state: {} }
};

function clone(value) {
  return structuredClone(value);
}

export function createDeviceService({ staleAfterMs = STALE_AFTER_MS, sweepIntervalMs = 5_000 } = {}) {
  const devices = new Map(Object.entries(clone(initialDevices)));
  const reportTimes = new Map();
  const master = { availability: "UNKNOWN", lastSeen: undefined };

  function updateStatus(idOrPayload, state, reportedAt = new Date()) {
    const payload = typeof idOrPayload === "string" ? { id: idOrPayload, state } : idOrPayload;
    const device = devices.get(payload.id);
    if (!device || device.availability === "NOT_CONFIGURED") return null;

    const now = new Date(reportedAt);
    const updated = {
      ...device,
      ...(payload.device ? { device: payload.device } : {}),
      state: payload.state ?? device.state,
      availability: "ONLINE",
      lastStatusAt: now.toISOString()
    };
    devices.set(payload.id, updated);
    reportTimes.set(payload.id, now.getTime());
    master.availability = "ONLINE";
    master.lastSeen = now.toISOString();
    emitDeviceStatus(clone(updated));
    emitDeviceAvailability({ id: payload.id, availability: "ONLINE", updatedAt: updated.lastStatusAt });
    emitMasterStatus(clone(master));
    return clone(updated);
  }

  function markAvailability(id, availability, updatedAt = new Date()) {
    const device = devices.get(id);
    if (!device) return null;
    const timestamp = new Date(updatedAt).toISOString();
    const updated = { ...device, availability, ...(availability === "ONLINE" ? { lastStatusAt: timestamp } : {}) };
    devices.set(id, updated);
    if (availability === "ONLINE") reportTimes.set(id, new Date(timestamp).getTime());
    emitDeviceAvailability({ id, availability, updatedAt: timestamp });
    return clone(updated);
  }

  function updateMasterAvailability(availability, lastSeen = new Date()) {
    master.availability = availability;
    if (availability === "ONLINE") master.lastSeen = new Date(lastSeen).toISOString();
    emitMasterStatus(clone(master));
    return clone(master);
  }

  function markAllUnknown() {
    for (const [id, device] of devices) {
      if (device.availability === "NOT_CONFIGURED") continue;
      if (device.availability !== "UNKNOWN") {
        devices.set(id, { ...device, availability: "UNKNOWN" });
        emitDeviceAvailability({ id, availability: "UNKNOWN", updatedAt: new Date().toISOString() });
      }
    }
    return updateMasterAvailability("UNKNOWN");
  }

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [id, reportedAt] of reportTimes) {
      const device = devices.get(id);
      if (device?.availability === "ONLINE" && now - reportedAt >= staleAfterMs) {
        devices.set(id, { ...device, availability: "UNKNOWN" });
        emitDeviceAvailability({ id, availability: "UNKNOWN", updatedAt: new Date().toISOString() });
      }
    }
  }, sweepIntervalMs);
  timer.unref?.();

  return {
    updateStatus,
    markAvailability,
    updateMasterAvailability,
    markAllUnknown,
    getSnapshot() {
      return { devices: Array.from(devices.values(), clone), master: clone(master) };
    },
    getDevice(id) {
      const device = devices.get(id);
      return device ? clone(device) : null;
    },
    list() {
      return Array.from(devices.values(), clone);
    },
    stop() {
      clearInterval(timer);
    }
  };
}

export const deviceService = createDeviceService();
export const { updateStatus, markAvailability, updateMasterAvailability, markAllUnknown, getSnapshot, getDevice, list } = deviceService;
