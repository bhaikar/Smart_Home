import type { AiCommandRequest, AiResult, Command, CommandRequest, DashboardData, Device, ActivityEvent } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.name = "ApiError"; this.status = status; }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const body = await response.json().catch(() => null) as { message?: string; error?: string } | null;
  if (!response.ok) throw new ApiError(body?.error ?? body?.message ?? `Request failed with status ${response.status}`, response.status);
  return body as T;
}

function unwrapArray<T>(body: T[] | { devices?: T[]; events?: T[] }): T[] {
  if (Array.isArray(body)) return body;
  if ("devices" in body && Array.isArray(body.devices)) return body.devices;
  if ("events" in body && Array.isArray(body.events)) return body.events;
  return [];
}

function normalizeDevice(device: Device): Device {
  const backendDevice = device as Device & { device?: string };
  const metadata = {
    door_security: { name: "Front door", type: "DOOR_SECURITY" },
    water_pump: { name: "Water pump", type: "WATER_PUMP" },
    fan: { name: "Fan", type: "FAN" },
    reserved: { name: "Reserved slot", type: "RESERVED" }
  }[backendDevice.device ?? ""] ?? { name: device.name ?? device.id, type: device.type };
  return { ...device, name: device.name ?? metadata.name, type: device.type ?? metadata.type };
}

function normalizeDashboard(data: DashboardData): DashboardData {
  return { ...data, devices: data.devices.map(normalizeDevice) };
}

function normalizeAiResult(result: AiResult): AiResult {
  if (!result.interpretedCommand) return result;
  const command = result.interpretedCommand;
  return { ...result, parameters: { deviceId: command.deviceId, action: command.action, ...command.parameters }, interpretedCommand: command };
}

export const api = {
  getDashboard: async () => normalizeDashboard(await request<DashboardData>("/api/dashboard")),
  getDevices: async () => unwrapArray(await request<Device[] | { devices: Device[] }>("/api/devices")),
  getEvents: async () => unwrapArray(await request<ActivityEvent[] | { events: ActivityEvent[] }>("/api/events")),
  getCommand: (id: string) => request<Command>(`/api/commands/${encodeURIComponent(id)}`),
  sendCommand: (command: CommandRequest) => {
    const { deviceId, action, parameters = {} } = command;
    const validatedParameters = Object.fromEntries(Object.entries(parameters).filter(([key]) => key !== "deviceId" && key !== "action"));
    return request<Command>("/api/commands", { method: "POST", body: JSON.stringify({ deviceId, action, parameters: validatedParameters }) });
  },
  sendAiCommand: async (command: AiCommandRequest) => normalizeAiResult(await request<AiResult>("/api/ai/command", { method: "POST", body: JSON.stringify(command) })),
};
