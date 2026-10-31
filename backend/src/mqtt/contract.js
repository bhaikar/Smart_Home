import { z } from "zod";
import { MQTT_TOPICS } from "../config/index.js";

// These are the agreed HomeMate topics from SPEC.md. Keep all hardware-contract
// assumptions here so they can be changed after confirmation with the hardware developer.
export const topics = MQTT_TOPICS;

// The specification defines messageType values but leaves the exact result field
// naming for ACK/FAILED messages to the hardware contract. We accept the documented
// status/result forms here and normalize them in handlers.js.
export const messageSchema = z.object({
  version: z.literal(1),
  messageType: z.enum(["COMMAND", "ACK", "FAILED", "STATUS", "EVENT", "HEARTBEAT"]),
  commandId: z.string().min(1).optional(),
  slaveId: z.enum(["slave_1", "slave_2", "slave_3", "slave_4"]).optional(),
  device: z.string().min(1).optional(),
  state: z.object({
    power: z.boolean().optional(),
    remainingSeconds: z.number().int().optional(),
    level: z.enum(["OFF", "LOW", "MEDIUM", "HIGH"]).optional(),
    angle: z.number().int().optional(),
    locked: z.boolean().optional()
  }).optional(),
  result: z.enum(["ACK", "FAILED"]).optional(),
  status: z.enum(["ACK", "FAILED", "ONLINE", "OFFLINE"]).optional(),
  success: z.boolean().optional(),
  message: z.string().optional(),
  data: z.record(z.unknown()).optional()
}).strict();

export const availabilitySchema = z.object({
  version: z.literal(1),
  messageType: z.literal("HEARTBEAT"),
  status: z.enum(["ONLINE", "OFFLINE", "online", "offline"]).transform((value) => value.toUpperCase()),
  slaveId: z.enum(["slave_1", "slave_2", "slave_3", "slave_4"]).optional(),
  device: z.string().min(1).optional()
}).strict();
