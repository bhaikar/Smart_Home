"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import type { ActivityEvent, AiResult, Command, CommandRequest, DashboardData, Device, DeviceAvailabilityPayload, DeviceStatusPayload, MasterStatus, PumpState, FanState, FanLevel } from "@/types";
import { api } from "@/services/api";
import { normalizeDevicePayload, normalizeMasterPayload, normalizeSnapshot } from "@/services/socket";
import { DEVICE_STALE_AFTER_MS, MOCK_MODE, mockAiResult, mockCommand, mockDevices, mockEvent, mockMaster, type MockFailureMode } from "@/services/mock";
import { useSocket } from "./useSocket";

type State = { devices: Device[]; master: MasterStatus; commands: Command[]; events: ActivityEvent[]; aiResult?: AiResult; error?: string };
type Action =
  | { type: "HYDRATE"; data: DashboardData }
  | { type: "DEVICE_STATUS"; payload: DeviceStatusPayload }
  | { type: "DEVICE_STATE"; deviceId: "slave_1" | "slave_2" | "slave_3"; state: Device["state"] }
  | { type: "DEVICE_AVAILABILITY"; payload: DeviceAvailabilityPayload }
  | { type: "TICK_PUMP"; deviceId: "slave_2" }
  | { type: "MASTER_STATUS"; payload: MasterStatus }
  | { type: "COMMAND"; payload: Command }
  | { type: "EVENT"; payload: ActivityEvent }
  | { type: "AI_RESULT"; payload: AiResult }
  | { type: "ERROR"; message: string };

const initialState: State = { devices: MOCK_MODE ? mockDevices() : [], master: MOCK_MODE ? mockMaster() : { availability: "UNKNOWN" }, commands: [], events: [] };
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE": return { ...state, ...action.data, events: action.data.events.slice(0, 100) };
    case "DEVICE_STATUS": return { ...state, devices: state.devices.map((device) => device.id === action.payload.id ? { ...device, ...action.payload, lastStatusAt: new Date().toISOString() } : device) };
    case "DEVICE_STATE": return { ...state, devices: state.devices.map((device) => device.id === action.deviceId ? { ...device, state: action.state, lastStatusAt: new Date().toISOString() } : device) };
    case "TICK_PUMP": return { ...state, devices: state.devices.map((device) => { if (device.id !== action.deviceId || device.type !== "WATER_PUMP") return device; const pump = device.state as Partial<PumpState>; const remainingSeconds = Math.max(0, (pump.remainingSeconds ?? 0) - 1); return { ...device, state: { power: remainingSeconds > 0, remainingSeconds }, lastStatusAt: new Date().toISOString() }; }) };
    case "DEVICE_AVAILABILITY": return { ...state, devices: state.devices.map((device) => device.id === action.payload.id ? { ...device, availability: action.payload.availability, ...(action.payload.availability === "UNKNOWN" ? {} : { lastStatusAt: action.payload.updatedAt ?? new Date().toISOString() }) } : device) };
    case "MASTER_STATUS": return { ...state, master: { ...action.payload, lastStatusAt: action.payload.lastStatusAt ?? new Date().toISOString() } };
    case "COMMAND": return { ...state, commands: [action.payload, ...state.commands.filter((command) => command.id !== action.payload.id)] };
    case "EVENT": return { ...state, events: [action.payload, ...state.events].slice(0, 100) };
    case "AI_RESULT": return { ...state, aiResult: action.payload };
    case "ERROR": return { ...state, error: action.message };
  }
}

type HomeMateContextValue = State & { connectionState: ReturnType<typeof useSocket>["connectionState"]; sendCommand: (request: CommandRequest, failureMode?: MockFailureMode) => Promise<Command>; sendAiMessage: (message: string) => Promise<AiResult>; demoMode: boolean };
const HomeMateContext = createContext<HomeMateContextValue | null>(null);

export function HomeMateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const handlers = useMemo(() => ({
    "device:status": (payload: DeviceStatusPayload) => dispatch({ type: "DEVICE_STATUS", payload: normalizeDevicePayload(payload) }),
    "device:availability": (payload: DeviceAvailabilityPayload) => dispatch({ type: "DEVICE_AVAILABILITY", payload }),
    "device:event": (payload: ActivityEvent) => dispatch({ type: "EVENT", payload }),
    "command:updated": (payload: Command) => dispatch({ type: "COMMAND", payload }),
    "master:status": (payload: MasterStatus) => dispatch({ type: "MASTER_STATUS", payload: normalizeMasterPayload(payload) }),
    snapshot: (payload: DashboardData) => dispatch({ type: "HYDRATE", data: normalizeSnapshot(payload) }),
  }), []);
  const { connectionState } = useSocket(handlers, !MOCK_MODE);

  useEffect(() => {
    if (MOCK_MODE) {
      const online = window.setTimeout(() => { dispatch({ type: "MASTER_STATUS", payload: { availability: "ONLINE" } }); dispatch({ type: "DEVICE_STATUS", payload: { id: "slave_1", availability: "ONLINE", state: {} } }); dispatch({ type: "DEVICE_STATUS", payload: { id: "slave_2", availability: "ONLINE", state: { power: false, remainingSeconds: 0 } } }); dispatch({ type: "DEVICE_STATUS", payload: { id: "slave_3", availability: "ONLINE", state: { level: "OFF" } } }); }, 2000);
      const events = window.setInterval(() => dispatch({ type: "EVENT", payload: mockEvent() }), 12000);
      return () => { window.clearTimeout(online); window.clearInterval(events); };
    }
    api.getDashboard().then((data) => dispatch({ type: "HYDRATE", data })).catch((error: unknown) => dispatch({ type: "ERROR", message: error instanceof Error ? error.message : "Unable to load dashboard" }));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const staleAt = Date.now() - DEVICE_STALE_AFTER_MS;
      state.devices.forEach((device) => { if (device.lastStatusAt && new Date(device.lastStatusAt).getTime() < staleAt && device.availability !== "NOT_CONFIGURED" && device.availability !== "UNKNOWN") dispatch({ type: "DEVICE_AVAILABILITY", payload: { id: device.id, availability: "UNKNOWN" } }); });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [state.devices]);

  const sendCommand = useCallback(async (request: CommandRequest, failureMode?: MockFailureMode) => {
    if (!MOCK_MODE) { const command = await api.sendCommand(request); dispatch({ type: "COMMAND", payload: command }); return command; }
    const command = mockCommand(request, failureMode); dispatch({ type: "COMMAND", payload: command });
    if (command.state === "FAILED") return command;
    window.setTimeout(() => dispatch({ type: "COMMAND", payload: { ...command, state: "ACKNOWLEDGED", updatedAt: new Date().toISOString() } }), 1000);
    window.setTimeout(() => {
      if (failureMode === "TIMEOUT") {
        dispatch({ type: "COMMAND", payload: { ...command, state: "TIMEOUT", updatedAt: new Date().toISOString() } });
        return;
      }
      dispatch({ type: "COMMAND", payload: { ...command, state: "EXECUTED", updatedAt: new Date().toISOString() } });
      if (request.deviceId === "slave_2") {
        const duration = typeof request.parameters?.durationSeconds === "number" ? request.parameters.durationSeconds : 0;
        dispatch({ type: "DEVICE_STATE", deviceId: "slave_2", state: { power: duration > 0, remainingSeconds: duration } satisfies PumpState });
        if (duration > 0) {
          const countdown = window.setInterval(() => dispatch({ type: "TICK_PUMP", deviceId: "slave_2" }), 1000);
          window.setTimeout(() => window.clearInterval(countdown), (duration + 1) * 1000);
        }
      } else if (request.deviceId === "slave_3" && typeof request.parameters?.level === "string") {
        dispatch({ type: "DEVICE_STATE", deviceId: "slave_3", state: { level: request.parameters.level as FanLevel } satisfies FanState });
      }
    }, 3000);
    return command;
  }, []);

  const sendAiMessage = useCallback(async (message: string) => { if (!MOCK_MODE) { const result = await api.sendAiCommand({ message }); dispatch({ type: "AI_RESULT", payload: result }); return result; } const result = mockAiResult(message); dispatch({ type: "AI_RESULT", payload: result }); return result; }, []);
  const value = useMemo(() => ({ ...state, connectionState, sendCommand, sendAiMessage, demoMode: MOCK_MODE }), [state, connectionState, sendCommand, sendAiMessage]);
  return <HomeMateContext.Provider value={value}>{children}</HomeMateContext.Provider>;
}

export function useHomeMate() { const context = useContext(HomeMateContext); if (!context) throw new Error("useHomeMate must be used inside HomeMateProvider"); return context; }
