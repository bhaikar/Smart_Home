export type Availability = "ONLINE" | "OFFLINE" | "UNKNOWN" | "NOT_CONFIGURED";
export type CommandState = "PENDING" | "SENT" | "ACKNOWLEDGED" | "EXECUTED" | "FAILED" | "TIMEOUT" | "CANCELLED";
export type DeviceId = "slave_1" | "slave_2" | "slave_3" | "slave_4";
export type PumpState = { power: boolean; remainingSeconds: number };
export type FanLevel = "OFF" | "LOW" | "MEDIUM" | "HIGH";
export type FanState = { level: FanLevel; angle?: number; remainingSeconds?: number };
export type DoorState = { lock?: "LOCKED" | "UNLOCKED"; lastEvent?: string };
export type DeviceState = PumpState | FanState | DoorState | Record<string, unknown>;

export type Device = {
  id: DeviceId;
  name: string;
  type: "DOOR_SECURITY" | "WATER_PUMP" | "FAN" | "RESERVED";
  availability: Availability;
  state: DeviceState;
  lastStatusAt?: string;
};

export type CommandParameters = Record<string, unknown>;
export type Command = {
  id: string;
  deviceId: DeviceId;
  action: string;
  parameters: CommandParameters;
  state: CommandState;
  createdAt: string;
  updatedAt: string;
  message?: string;
};

export type ActivityEvent = {
  id: string;
  type: string;
  message: string;
  deviceId?: DeviceId;
  createdAt: string;
  data?: Record<string, unknown>;
};

export type AiResult = {
  intent: "CONTROL_DEVICE" | "QUERY_STATUS" | "QUERY_EVENTS" | "CLARIFY" | "UNSUPPORTED";
  device?: string | null;
  action?: string | null;
  parameters: CommandParameters;
  confidence?: number;
  status: "ACCEPTED" | "REJECTED" | "NEEDS_CLARIFICATION";
  message: string;
  mode?: "groq" | "gemini" | "fallback";
  interpretedCommand?: CommandRequest;
  result?: unknown;
};

export type MasterStatus = {
  availability: Availability;
  lastStatusAt?: string;
};

export type DashboardData = {
  devices: Device[];
  master: MasterStatus;
  commands: Command[];
  events: ActivityEvent[];
};

export type DeviceStatusPayload = Partial<Device> & { id: DeviceId; state?: DeviceState };
export type DeviceAvailabilityPayload = { id: DeviceId; availability: Availability; updatedAt?: string };
export type CommandRequest = { deviceId: DeviceId; action: string; parameters?: CommandParameters };
export type AiCommandRequest = { message: string };
