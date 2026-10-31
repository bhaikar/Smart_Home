import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  MQTT_BROKER_URL: z.string().min(1),
  MQTT_USERNAME: z.string().min(1),
  MQTT_PASSWORD: z.string().min(1),
  CLOUD_AI_PROVIDER: z.enum(["groq", "gemini"]).optional().default("groq"),
  CLOUD_AI_API_KEY: z.string().min(1).optional(),
  CLOUD_AI_MODEL: z.string().min(1).optional().default("llama-3.3-70b-versatile"),
  FRONTEND_URL: z.string().url(),
  MOCK_MQTT: z.enum(["true", "false"]).optional().default("false")
});

const parsed = environmentSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid backend environment configuration: ${issues}`);
}

export const config = {
  ...parsed.data,
  MOCK_MQTT: parsed.data.MOCK_MQTT === "true"
};

export const STALE_AFTER_MS = 30_000;
export const ACK_TIMEOUT_MS = 5_000;
export const EXECUTION_TIMEOUT_MS = 15_000;
export const EVENT_CAP = 100;
export const DEVICE_DURATION_MIN_SECONDS = 60;
export const DEVICE_DURATION_MAX_SECONDS = 7200;
export const PUMP_MINUTES_MIN = 1;
export const PUMP_MINUTES_MAX = 120;

export const MQTT_TOPICS = Object.freeze({
  command: "homemate/001/master/command",
  result: "homemate/001/master/result",
  deviceStatus: "homemate/001/devices/status",
  deviceEvents: "homemate/001/devices/events",
  masterAvailability: "homemate/001/master/availability"
});
