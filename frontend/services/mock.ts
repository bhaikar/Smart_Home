import type { AiResult, Command, CommandRequest, Device, DeviceId, ActivityEvent, MasterStatus } from "@/types";

export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === "true";
export const DEVICE_STALE_AFTER_MS = 30_000;
export const MOCK_FAILURE_MODES = ["FAILED", "TIMEOUT"] as const;
export type MockFailureMode = (typeof MOCK_FAILURE_MODES)[number];

const now = () => new Date().toISOString();
export const mockDevices = (): Device[] => [
  { id: "slave_1", name: "Front door", type: "DOOR_SECURITY", availability: "UNKNOWN", state: {} },
  { id: "slave_2", name: "Water pump", type: "WATER_PUMP", availability: "UNKNOWN", state: {} },
  { id: "slave_3", name: "Fan", type: "FAN", availability: "UNKNOWN", state: {} },
  { id: "slave_4", name: "Reserved slot", type: "RESERVED", availability: "NOT_CONFIGURED", state: {} },
];
export const mockMaster = (): MasterStatus => ({ availability: "UNKNOWN" });

export function mockCommand(request: CommandRequest, failureMode?: MockFailureMode): Command {
  const timestamp = now();
  return { id: `demo_${Date.now()}`, deviceId: request.deviceId, action: request.action, parameters: request.parameters ?? {}, state: failureMode === "FAILED" ? "FAILED" : "SENT", createdAt: timestamp, updatedAt: timestamp, message: "Demo mode, not connected to real devices" };
}

export function mockAiResult(message: string): AiResult {
  const text = message.toLowerCase();
  if (text.includes("fan") && (text.includes("low") || text.includes("medium") || text.includes("high") || text.includes("off"))) {
    const level = (["low", "medium", "high", "off"].find((item) => text.includes(item)) ?? "low").toUpperCase();
    return { intent: "CONTROL_DEVICE", parameters: { deviceId: "slave_3", action: "SET", level }, confidence: 0.96, status: "ACCEPTED", message: "Demo mode: I understood that fan setting." };
  }
  if (text.includes("pump") && (text.includes("on") || text.includes("off"))) {
    const power = !text.includes("off");
    const minutesMatch = text.match(/(\d+)\s*(?:minute|min)/);
    const durationSeconds = minutesMatch ? Number(minutesMatch[1]) * 60 : 0;
    return { intent: "CONTROL_DEVICE", parameters: { deviceId: "slave_2", action: "SET", power, durationSeconds }, confidence: minutesMatch || !power ? 0.95 : 0.62, status: minutesMatch || !power ? "ACCEPTED" : "NEEDS_CLARIFICATION", message: power && !minutesMatch ? "How many minutes should the pump run?" : "Demo mode: I understood that pump command." };
  }
  if (text.includes("latest") && (text.includes("door") || text.includes("entry"))) return { intent: "QUERY_EVENTS", parameters: { deviceId: "slave_1" }, confidence: 0.94, status: "ACCEPTED", message: "Demo mode: I can show the latest door entries." };
  if (text.length < 5 || (!text.includes("fan") && !text.includes("pump") && !text.includes("door"))) return { intent: "CLARIFY", parameters: {}, confidence: 0.35, status: "NEEDS_CLARIFICATION", message: "Could you tell me whether you mean the fan, pump, or front door?" };
  return { intent: "UNSUPPORTED", parameters: {}, confidence: 0.45, status: "REJECTED", message: "I can help with the fan, water pump, or front door." };
}

export function mockEvent(deviceId: DeviceId = "slave_1"): ActivityEvent {
  const granted = Math.random() > 0.35;
  return { id: `demo_event_${Date.now()}`, type: granted ? "ACCESS_GRANTED" : "ACCESS_DENIED", message: granted ? "Front door access granted" : "Front door access denied", deviceId, createdAt: now() };
}
