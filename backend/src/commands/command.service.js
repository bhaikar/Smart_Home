import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ACK_TIMEOUT_MS, DEVICE_DURATION_MAX_SECONDS, DEVICE_DURATION_MIN_SECONDS, EXECUTION_TIMEOUT_MS } from "../config/index.js";
import { emitCommandUpdated } from "../sockets/socket.js";

const pumpParameters = z.object({
  power: z.boolean(),
  durationSeconds: z.number().int().min(DEVICE_DURATION_MIN_SECONDS).max(DEVICE_DURATION_MAX_SECONDS).optional()
}).strict().superRefine((value, context) => {
  if (value.power && value.durationSeconds === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "durationSeconds is required when turning the pump on" });
  }
  if (!value.power && value.durationSeconds !== undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "durationSeconds is not allowed when turning the pump off" });
  }
});

const commandSchema = z.discriminatedUnion("deviceId", [
  z.object({ deviceId: z.literal("slave_2"), action: z.literal("SET"), parameters: pumpParameters }),
  z.object({ deviceId: z.literal("slave_3"), action: z.literal("SET"), parameters: z.object({
    level: z.enum(["OFF", "LOW", "MEDIUM", "HIGH"]),
    durationSeconds: z.number().int().min(DEVICE_DURATION_MIN_SECONDS).max(DEVICE_DURATION_MAX_SECONDS).optional()
  }).strict().superRefine((value, context) => {
    if (value.level === "OFF" && value.durationSeconds !== undefined) context.addIssue({ code: z.ZodIssueCode.custom, message: "durationSeconds is not allowed when the fan is off" });
  }) })
]);

const activeStates = new Set(["PENDING", "SENT", "ACKNOWLEDGED"]);
const terminalStates = new Set(["EXECUTED", "FAILED", "TIMEOUT", "CANCELLED"]);

function copy(value) {
  return structuredClone(value);
}

function requestedState(command) {
  if (command.deviceId === "slave_2") return { power: command.parameters.power };
  return { level: command.parameters.level, ...(command.parameters.durationSeconds !== undefined ? { remainingSeconds: command.parameters.durationSeconds } : {}) };
}

export function validateCommand(input) {
  return commandSchema.parse(input);
}

export function createCommandService({ ackTimeoutMs = ACK_TIMEOUT_MS, executionTimeoutMs = EXECUTION_TIMEOUT_MS } = {}) {
  const commands = new Map();
  const timers = new Map();

  function transition(id, state, message) {
    const command = commands.get(id);
    if (!command || terminalStates.has(command.state)) return null;
    const updated = { ...command, state, updatedAt: new Date().toISOString(), ...(message ? { message } : {}) };
    commands.set(id, updated);
    emitCommandUpdated(copy(updated));
    return copy(updated);
  }

  function clearTimer(id) {
    const timer = timers.get(id);
    if (timer) clearTimeout(timer);
    timers.delete(id);
  }

  function scheduleTimeout(id, delay) {
    clearTimer(id);
    timers.set(id, setTimeout(() => {
      const command = commands.get(id);
      if (command && activeStates.has(command.state)) transition(id, "TIMEOUT", "The command timed out");
      timers.delete(id);
    }, delay));
    timers.get(id).unref?.();
  }

  function create(input) {
    const parsed = validateCommand(input);
    const duplicate = [...commands.values()].find((command) => command.deviceId === parsed.deviceId && activeStates.has(command.state) && JSON.stringify(command.parameters) === JSON.stringify(parsed.parameters));
    if (duplicate) throw new Error(`An identical command is already pending for ${parsed.deviceId}`);

    const now = new Date().toISOString();
    const command = {
      id: `cmd_${randomUUID()}`,
      deviceId: parsed.deviceId,
      action: parsed.action,
      parameters: parsed.parameters,
      state: "PENDING",
      createdAt: now,
      updatedAt: now
    };
    commands.set(command.id, command);
    emitCommandUpdated(copy(command));
    scheduleTimeout(command.id, ackTimeoutMs);
    return copy(command);
  }

  function markSent(id) {
    const command = transition(id, "SENT");
    if (command) scheduleTimeout(id, ackTimeoutMs);
    return command;
  }

  function handleAck(payload) {
    const id = typeof payload === "string" ? payload : payload.commandId;
    const command = transition(id, "ACKNOWLEDGED", "The master received the command");
    if (command) scheduleTimeout(id, executionTimeoutMs);
    return command;
  }

  function handleResult(payload) {
    const id = payload.commandId;
    if (!commands.has(id)) return null;
    if (payload.success === false || payload.result === "FAILED" || payload.status === "FAILED") {
      clearTimer(id);
      return transition(id, "FAILED", payload.message ?? "The device reported a failure");
    }
    return handleStatus(payload);
  }

  function handleStatus(payload) {
    const command = commands.get(payload.commandId);
    if (!command || !activeStates.has(command.state)) return null;
    const reported = payload.state ?? payload;
    const expected = requestedState(command);
    const matches = Object.entries(expected).every(([key, value]) => reported[key] === value);
    if (!matches) return null;
    clearTimer(command.id);
    return transition(command.id, "EXECUTED", "The device reported the requested state");
  }

  function cancel(id) {
    const command = transition(id, "CANCELLED", "The command was cancelled");
    if (command) clearTimer(id);
    return command;
  }

  function fail(id, message) {
    const command = transition(id, "FAILED", message ?? "The command failed");
    if (command) clearTimer(id);
    return command;
  }

  return {
    create, markSent, handleAck, handleResult, handleStatus, cancel, fail,
    get(id) { return copy(commands.get(id) ?? null); },
    list() { return [...commands.values()].map(copy); },
    clear() { for (const id of timers.keys()) clearTimer(id); commands.clear(); }
  };
}

export const commandService = createCommandService();
export const { create, markSent, handleAck, handleResult, handleStatus, cancel } = commandService;
export { commandSchema };
