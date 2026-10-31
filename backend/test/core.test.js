import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { createCommandService, validateCommand } from "../src/commands/command.service.js";
import { createEventService } from "../src/events/event.service.js";
import { createDeviceService } from "../src/devices/device.service.js";

test("command validator accepts supported pump and fan commands", () => {
  assert.deepEqual(validateCommand({ deviceId: "slave_2", action: "SET", parameters: { power: true, durationSeconds: 1200 } }), {
    deviceId: "slave_2", action: "SET", parameters: { power: true, durationSeconds: 1200 }
  });
  assert.doesNotThrow(() => validateCommand({ deviceId: "slave_2", action: "SET", parameters: { power: false } }));
  assert.doesNotThrow(() => validateCommand({ deviceId: "slave_3", action: "SET", parameters: { level: "HIGH" } }));
  assert.deepEqual(validateCommand({ deviceId: "slave_3", action: "SET", parameters: { level: "LOW", durationSeconds: 1800 } }), { deviceId: "slave_3", action: "SET", parameters: { level: "LOW", durationSeconds: 1800 } });
});

test("command validator rejects unsupported devices and parameters", () => {
  assert.throws(() => validateCommand({ deviceId: "slave_1", action: "SET", parameters: {} }), z.ZodError);
  assert.throws(() => validateCommand({ deviceId: "slave_2", action: "SET", parameters: { power: true, durationSeconds: 30 } }), z.ZodError);
  assert.throws(() => validateCommand({ deviceId: "slave_2", action: "SET", parameters: { power: false, durationSeconds: 60 } }), z.ZodError);
  assert.throws(() => validateCommand({ deviceId: "slave_3", action: "SET", parameters: { level: "TURBO" } }), z.ZodError);
  assert.throws(() => validateCommand({ deviceId: "slave_3", action: "SET", parameters: { level: "OFF", durationSeconds: 60 } }), z.ZodError);
  assert.throws(() => validateCommand({ deviceId: "slave_3", action: "SET", parameters: { level: "LOW", durationSeconds: 30 } }), z.ZodError);
  assert.throws(() => validateCommand({ deviceId: "slave_3", action: "SET", parameters: { level: "HIGH", durationSeconds: 7201 } }), z.ZodError);
});

test("command lifecycle keeps ACK separate from execution", () => {
  const service = createCommandService({ ackTimeoutMs: 1000, executionTimeoutMs: 1000 });
  const command = service.create({ deviceId: "slave_3", action: "SET", parameters: { level: "LOW" } });
  service.markSent(command.id);
  const acknowledged = service.handleAck({ commandId: command.id });
  assert.equal(acknowledged.state, "ACKNOWLEDGED");
  assert.equal(service.get(command.id).state, "ACKNOWLEDGED");
  assert.equal(service.handleStatus({ commandId: command.id, state: { level: "HIGH" } }), null);
  assert.equal(service.handleStatus({ commandId: command.id, state: { level: "LOW" } }).state, "EXECUTED");
  const timedFan = service.create({ deviceId: "slave_3", action: "SET", parameters: { level: "LOW", durationSeconds: 1800 } });
  service.markSent(timedFan.id);
  service.handleAck({ commandId: timedFan.id });
  assert.equal(service.handleStatus({ commandId: timedFan.id, state: { level: "LOW", remainingSeconds: 1799 } }), null);
  assert.equal(service.handleStatus({ commandId: timedFan.id, state: { level: "LOW", remainingSeconds: 1800 } }).state, "EXECUTED");
  service.clear();
});

test("identical active commands are rejected", () => {
  const service = createCommandService({ ackTimeoutMs: 1000 });
  service.create({ deviceId: "slave_2", action: "SET", parameters: { power: true, durationSeconds: 60 } });
  assert.throws(() => service.create({ deviceId: "slave_2", action: "SET", parameters: { power: true, durationSeconds: 60 } }), /already pending/);
  service.clear();
});

test("commands time out without acknowledgement", async () => {
  const service = createCommandService({ ackTimeoutMs: 10, executionTimeoutMs: 10 });
  const command = service.create({ deviceId: "slave_3", action: "SET", parameters: { level: "OFF" } });
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(service.get(command.id).state, "TIMEOUT");
  service.clear();
});

test("device service starts with unknown devices and reserved slave", () => {
  const service = createDeviceService({ sweepIntervalMs: 1000 });
  const snapshot = service.getSnapshot();
  assert.deepEqual(snapshot.devices.map(({ id, availability }) => ({ id, availability })), [
    { id: "slave_1", availability: "UNKNOWN" },
    { id: "slave_2", availability: "UNKNOWN" },
    { id: "slave_3", availability: "UNKNOWN" },
    { id: "slave_4", availability: "NOT_CONFIGURED" }
  ]);
  service.stop();
});

test("event service caps temporary history at 100", () => {
  const service = createEventService({ cap: 100 });
  for (let index = 0; index < 101; index += 1) service.addEvent({ type: "TEST", message: String(index) });
  assert.equal(service.list().length, 100);
  assert.equal(service.list()[0].message, "100");
});
