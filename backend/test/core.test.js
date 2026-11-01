import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { createMqttInspector } from "../src/mqtt/debug-inspector.js";
import { topics } from "../src/mqtt/contract.js";

const SAMPLES = "scripts/samples";

function check(file, topic) {
  return execSync(`npm run contract:check -- ${SAMPLES}/${file}.json ${topic}`).toString();
}

function checkFails(file, topic) {
  assert.throws(() => check(file, topic), /exit code 1/);
}

function checkPasses(file, topic) {
  assert.doesNotThrow(() => check(file, topic));
}

function checkOutput(file, topic, expected) {
  const output = check(file, topic);
  assert.match(output, new RegExp(expected));
}

test("contract checker validates all samples", () => {
  checkPasses("command-pump", topics.command);
  checkPasses("ack", topics.result);
  checkPasses("status-pump", topics.deviceStatus);
  checkPasses("status-fan-timer", topics.deviceStatus);
  checkPasses("status-door", topics.deviceStatus);
  checkPasses("event-door", topics.deviceEvents);
  checkPasses("failed", topics.result);
  checkPasses("heartbeat-online", topics.masterAvailability);
  checkPasses("heartbeat-offline", topics.masterAvailability);
});

test("contract checker rejects malformed samples", () => {
  checkFails("command-pump", topics.deviceStatus);
  checkFails("ack", topics.command);
  checkFails("status-pump", topics.command);
  checkFails("status-fan-timer", topics.command);
  checkFails("status-door", topics.command);
  checkFails("event-door", topics.command);
  checkFails("failed", topics.command);
  checkFails("heartbeat-online", topics.command);
  checkFails("heartbeat-offline", topics.command);
});

test("contract checker reports missing fields", () => {
  checkOutput("command-pump", topics.command, "Missing required fields: none");
  checkOutput("ack", topics.result, "Missing required fields: none");
  checkOutput("status-pump", topics.deviceStatus, "Missing required fields: none");
  checkOutput("status-fan-timer", topics.deviceStatus, "Missing required fields: none");
  checkOutput("status-door", topics.deviceStatus, "Missing required fields: none");
  checkOutput("event-door", topics.deviceEvents, "Missing required fields: none");
  checkOutput("failed", topics.result, "Missing required fields: none");
  checkOutput("heartbeat-online", topics.masterAvailability, "Missing required fields: none");
  checkOutput("heartbeat-offline", topics.masterAvailability, "Missing required fields: none");
});

test("contract checker reports unexpected fields", () => {
  checkOutput("command-pump", topics.command, "Unexpected fields: none");
  checkOutput("ack", topics.result, "Unexpected fields: none");
  checkOutput("status-pump", topics.deviceStatus, "Unexpected fields: none");
  checkOutput("status-fan-timer", topics.deviceStatus, "Unexpected fields: none");
  checkOutput("status-door", topics.deviceStatus, "Unexpected fields: none");
  checkOutput("event-door", topics.deviceEvents, "Unexpected fields: none");
  checkOutput("failed", topics.result, "Unexpected fields: none");
  checkOutput("heartbeat-online", topics.masterAvailability, "Unexpected fields: none");
  checkOutput("heartbeat-offline", topics.masterAvailability, "Unexpected fields: none");
});

test("contract checker reports validation errors", () => {
  checkOutput("command-pump", topics.command, "Validation/type errors: none");
  checkOutput("ack", topics.result, "Validation/type errors: none");
  checkOutput("status-pump", topics.deviceStatus, "Validation/type errors: none");
  checkOutput("status-fan-timer", topics.deviceStatus, "Validation/type errors: none");
  checkOutput("status-door", topics.deviceStatus, "Validation/type errors: none");
  checkOutput("event-door", topics.deviceEvents, "Validation/type errors: none");
  checkOutput("failed", topics.result, "Validation/type errors: none");
  checkOutput("heartbeat-online", topics.masterAvailability, "Validation/type errors: none");
  checkOutput("heartbeat-offline", topics.masterAvailability, "Validation/type errors: none");
});

test("MQTT inspector records messages", () => {
  const inspector = createMqttInspector({ enabled: true });
  inspector.record({ topic: topics.command, payload: "{\"version\":1,\"messageType\":\"COMMAND\",\"commandId\":\"cmd_sample_pump\",\"target\":\"slave_2\",\"device\":\"water_pump\",\"action\":\"SET\",\"parameters\":{\"power\":true,\"durationSeconds\":1200}}", handler: "handleCommand" });
  const messages = inspector.list();
  assert.equal(messages.length, 1);
  assert.equal(messages[0].topic, topics.command);
  assert.equal(messages[0].parsedOk, true);
  assert.equal(messages[0].validationErrors.length, 0);
  assert.equal(messages[0].handler, "handleCommand");
});
