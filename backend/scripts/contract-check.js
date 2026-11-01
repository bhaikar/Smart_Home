#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { messageSchema, availabilitySchema, topics } from "../src/mqtt/contract.js";
import { validateCommand } from "../src/commands/command.service.js";

const file = process.argv[2];
const topic = process.argv[3];
if (!file) {
  console.error("Usage: npm run contract:check -- <file.json> [topic]");
  process.exit(2);
}

let value;
try { value = JSON.parse(fs.readFileSync(path.resolve(file), "utf8")); }
catch (error) { console.error(`Could not read JSON: ${error.message}`); process.exit(1); }

const isCommand = value?.messageType === "COMMAND";
const schema = topic === topics.masterAvailability ? availabilitySchema : messageSchema;
const result = isCommand ? checkCommand(value) : schema.safeParse(value);
const inboundKeys = ["version", "messageType", "commandId", "slaveId", "device", "state", "result", "status", "success", "message", "data"];
const commandKeys = ["version", "messageType", "commandId", "target", "device", "action", "parameters"];
const keys = new Set(isCommand ? commandKeys : inboundKeys);
const unexpected = value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).filter((key) => !keys.has(key)) : [];
const required = isCommand ? ["version", "messageType", "commandId", "target", "action", "parameters"] : ["version", "messageType"];
const missing = required.filter((key) => value?.[key] === undefined);
const errors = result.success ? [] : result.error.issues.map((issue) => `${issue.path.join(".") || "(message)"}: ${issue.message}`);
const routing = topic === topics.command ? "Backend publishes to the master; the backend does not route incoming commands." : topic === topics.result ? "handleResult" : topic === topics.deviceStatus ? "handleStatus" : topic === topics.deviceEvents ? "handleEvent" : topic === topics.masterAvailability ? "handleAvailability" : "Unknown topic; no backend handler.";
let treatment = "Not evaluated.";
if (result.success && value.messageType === "STATUS") treatment = value.commandId ? "handleStatus would update the device and could move the matching active command to EXECUTED only if reported state matches." : "handleStatus would refresh device state; no command would be moved to EXECUTED.";
if (result.success && value.messageType === "ACK") treatment = value.commandId ? "handleResult would move the matching command to ACKNOWLEDGED." : "Dropped: ACK requires commandId for routing.";
if (result.success && value.messageType === "FAILED") treatment = value.commandId ? "handleResult would move the matching command to FAILED." : "Dropped: FAILED requires commandId for routing.";
if (result.success && value.messageType === "EVENT") treatment = "handleEvent would add the event to in-memory history.";
if (result.success && value.messageType === "HEARTBEAT") treatment = "handleAvailability would update master or slave availability.";
if (isCommand) treatment = result.success ? "Backend would publish this command to the master. Incoming commands are not routed." : "Not published: command failed allowlist validation.";

console.log(`Contract check: ${file}`);
console.log(`Valid against selected schema: ${result.success ? "yes" : "no"}`);
console.log(`Topic: ${topic ?? "not supplied"}`);
console.log(`Expected topic: ${value.messageType === "COMMAND" ? topics.command : value.messageType === "ACK" || value.messageType === "FAILED" ? topics.result : value.messageType === "STATUS" ? topics.deviceStatus : value.messageType === "EVENT" ? topics.deviceEvents : value.messageType === "HEARTBEAT" ? topics.masterAvailability : "unknown"}`);
console.log(`Routing: ${routing}`);
console.log(`Treatment: ${treatment}`);
console.log(`Missing required fields: ${missing.length ? missing.join(", ") : "none"}`);
console.log(`Unexpected fields: ${unexpected.length ? unexpected.join(", ") : "none"}`);
console.log(`Validation/type errors: ${errors.length ? errors.join(" | ") : "none"}`);
process.exit(result.success && unexpected.length === 0 && missing.length === 0 ? 0 : 1);

function checkCommand(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { success: false, error: { issues: [{ path: [], message: "Expected an object" }] } };
  const envelope = z.object({ version: z.literal(1), messageType: z.literal("COMMAND"), commandId: z.string().min(1) }).safeParse(value);
  if (!envelope.success) return envelope;
  try {
    validateCommand({ deviceId: value.target, action: value.action, parameters: value.parameters });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof z.ZodError ? error : { issues: [{ path: ["target"], message: error.message }] } };
  }
}
