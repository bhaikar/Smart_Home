import { io, type Socket } from "socket.io-client";
import type { ActivityEvent, Command, Device, DeviceAvailabilityPayload, DeviceStatusPayload, MasterStatus } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
export type SocketEvents = {
  "device:status": (payload: DeviceStatusPayload) => void;
  "device:availability": (payload: DeviceAvailabilityPayload) => void;
  "device:event": (payload: ActivityEvent) => void;
  "command:updated": (payload: Command) => void;
  "master:status": (payload: MasterStatus & { lastSeen?: string }) => void;
  snapshot: (payload: { devices: Device[]; master: MasterStatus; commands: Command[]; events: ActivityEvent[] }) => void;
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (error: Error) => void;
};

export function createHomeMateSocket(): Socket<SocketEvents> {
  return io(API_URL, { autoConnect: false, transports: ["websocket", "polling"] });
}

export function normalizeDevicePayload(payload: DeviceStatusPayload): DeviceStatusPayload {
  return payload;
}

export function normalizeMasterPayload(payload: MasterStatus & { lastSeen?: string }): MasterStatus {
  return { availability: payload.availability, lastStatusAt: payload.lastStatusAt ?? payload.lastSeen };
}

export function normalizeSnapshot(payload: { devices: Device[]; master: MasterStatus & { lastSeen?: string }; commands: Command[]; events: ActivityEvent[] }): { devices: Device[]; master: MasterStatus; commands: Command[]; events: ActivityEvent[] } {
  return { ...payload, master: normalizeMasterPayload(payload.master) };
}
