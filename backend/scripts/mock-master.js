#!/usr/bin/env node
/**
 * MOCK MASTER — simulated MQTT master for local development and timeout testing.
 * This script is not real hardware and must never be used as a hardware test result.
 */

import "dotenv/config";
import mqtt from "mqtt";
import { MQTT_TOPICS } from "../src/config/index.js";

const flags = new Set(process.argv.slice(2));
const shouldFail = flags.has("--fail");
const shouldStaySilent = flags.has("--silent");
const shouldPublishOffline = flags.has("--offline");
const shouldDuplicate = flags.has("--duplicate");
const shouldSlow = flags.has("--slow");
const shouldLate = flags.has("--late");
const shouldGarbage = flags.has("--garbage");
const shouldNoCommandId = flags.has("--no-commandid");
const shouldNoHeartbeat = flags.has("--no-heartbeat");
const slaveOffline = flags.has("--slave-offline=slave_2") ? "slave_2" : null;
const clientId = `homemate-mock-master-${process.pid}`;

const pump = { power: false, remainingSeconds: 0 };
const fan = { level: "OFF", angle: 0, remainingSeconds: 0 };
const lock = { locked: true };
let lastPumpCommandId;
let lastFanCommandId;
let connected = false;
let heartbeatTimer;
let pumpTimer;
let eventTimer;

console.log("[MOCK] HomeMate mock master starting — not real hardware");
console.log(`[MOCK] flags: ${[...flags].join(" ") || "none"}`);

const client = mqtt.connect(process.env.MQTT_BROKER_URL, {
  clientId,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  protocol: "mqtts",
  reconnectPeriod: 1000,
  clean: true
});

function publish(topic, payload) {
  if (shouldPublishOffline || shouldStaySilent) return;
  client.publish(topic, JSON.stringify(payload), { qos: 1, retain: false }, (error) => {
    if (error) console.error("[MOCK] publish failed:", error.message);
  });
  if (shouldDuplicate) {
    setTimeout(() => {
      client.publish(topic, JSON.stringify(payload), { qos: 1, retain: false });
    }, 100);
  }
}

function availability(status) {
  if (shouldNoHeartbeat) return;
  publish(MQTT_TOPICS.masterAvailability, {
    version: 1,
    messageType: "HEARTBEAT",
    status,
    device: "master"
  });
  console.log(`[MOCK] master availability: ${status}`);
}

function publishPumpStatus(commandId) {
  if (slaveOffline === "slave_2") return;
  const message = {
    version: 1,
    messageType: "STATUS",
    ...(shouldNoCommandId ? {} : { commandId }),
    slaveId: "slave_2",
    device: "water_pump",
    state: { ...pump }
  };
  publish(MQTT_TOPICS.deviceStatus, message);
}

function publishFanStatus(commandId) {
  if (slaveOffline === "slave_3") return;
  const message = {
    version: 1,
    messageType: "STATUS",
    ...(shouldNoCommandId ? {} : { commandId }),
    slaveId: "slave_3",
    device: "fan",
    state: { ...fan }
  };
  publish(MQTT_TOPICS.deviceStatus, message);
}

function publishLockStatus() {
  if (slaveOffline === "slave_1") return;
  publish(MQTT_TOPICS.deviceStatus, {
    version: 1,
    messageType: "STATUS",
    slaveId: "slave_1",
    device: "door_security",
    state: { ...lock }
  });
}

function publishAllStatus() {
  console.log("[MOCK] publishing STATUS heartbeat — not real hardware");
  publishPumpStatus();
  publishFanStatus();
  publishLockStatus();
}

function publishGarbage() {
  if (!shouldGarbage || Math.random() > 0.3) return;
  const garbage = [
    "{",
    "{\"version\":1",
    "{\"messageType\":\"STATUS\",\"state\":{\"power\":true}}",
    "{\"messageType\":\"STATUS\",\"state\":{\"power\":true,\"remainingSeconds\":\"not a number\"}}",
    "{\"messageType\":\"STATUS\",\"state\":{\"power\":true,\"remainingSeconds\":1200,\"extraField\":true}}",
    "{\"messageType\":\"STATUS\",\"state\":{\"power\":true,\"remainingSeconds\":1200}}".repeat(1000)
  ];
  client.publish(MQTT_TOPICS.deviceStatus, garbage[Math.floor(Math.random() * garbage.length)], { qos: 1, retain: false });
}

function handleCommand(raw) {
  let command;
  try {
    command = JSON.parse(raw.toString());
  } catch {
    console.warn("[MOCK] ignored non-JSON command");
    return;
  }

  console.log(`[MOCK] command received: ${command.commandId ?? "unknown"}`);
  if (shouldStaySilent) {
    console.log("[MOCK] --silent enabled: no ACK will be sent");
    return;
  }

  setTimeout(() => {
    if (shouldFail) {
      publish(MQTT_TOPICS.result, {
        version: 1,
        messageType: "FAILED",
        commandId: command.commandId,
        status: "FAILED",
        success: false,
        message: "[MOCK] Simulated master failure"
      });
      console.log("[MOCK] sent FAILED result");
      return;
    }

    publish(MQTT_TOPICS.result, {
      version: 1,
      messageType: "ACK",
      commandId: command.commandId,
      status: "ACK",
      success: true,
      message: "[MOCK] Command acknowledged by simulated master"
    });
    console.log("[MOCK] sent ACK");

    const parameters = command.parameters ?? {};
    if (command.device === "water_pump" && command.target === "slave_2") {
      pump.power = parameters.power;
      pump.remainingSeconds = parameters.power ? parameters.durationSeconds : 0;
      lastPumpCommandId = command.commandId;
      setTimeout(() => publishPumpStatus(command.commandId), shouldLate ? 20_000 : shouldSlow ? 8_000 : 3_000);
    } else if (command.device === "fan" && command.target === "slave_3") {
      fan.level = parameters.level;
      fan.remainingSeconds = parameters.durationSeconds ?? 0;
      lastFanCommandId = command.commandId;
      setTimeout(() => publishFanStatus(command.commandId), shouldLate ? 20_000 : shouldSlow ? 8_000 : 3_000);
    } else {
      publish(MQTT_TOPICS.result, {
        version: 1,
        messageType: "FAILED",
        commandId: command.commandId,
        status: "FAILED",
        success: false,
        message: "[MOCK] Unsupported simulated target"
      });
    }
  }, shouldSlow ? 3_000 : 1_000);
}

client.on("connect", () => {
  connected = true;
  console.log("[MOCK] connected to MQTT broker — not a real master");
  client.subscribe(MQTT_TOPICS.command, { qos: 1 }, (error) => {
    if (error) {
      console.error("[MOCK] command subscription failed:", error.message);
      return;
    }
    if (shouldPublishOffline) {
      availability("OFFLINE");
      console.log("[MOCK] --offline published; heartbeat remains disabled");
      return;
    }
    availability("ONLINE");
    publishAllStatus();
    if (!shouldNoHeartbeat) {
      heartbeatTimer = setInterval(() => {
        availability("ONLINE");
        publishAllStatus();
      }, 10_000);
    }
  });
});

client.on("message", (topic, payload) => {
  if (topic === MQTT_TOPICS.command) handleCommand(payload);
});
client.on("reconnect", () => console.log("[MOCK] reconnecting to MQTT broker"));
client.on("close", () => {
  connected = false;
  console.log("[MOCK] MQTT connection closed");
});
client.on("error", (error) => console.error("[MOCK] MQTT error:", error.message));

pumpTimer = setInterval(() => {
  if (pump.power) {
    pump.remainingSeconds -= 1;
    if (pump.remainingSeconds <= 0) {
      pump.power = false;
      pump.remainingSeconds = 0;
    }
    publishPumpStatus(lastPumpCommandId);
  }
  if (fan.level !== "OFF" && fan.remainingSeconds > 0) {
    fan.remainingSeconds -= 1;
    if (fan.remainingSeconds <= 0) {
      fan.level = "OFF";
      fan.remainingSeconds = 0;
    }
    console.log("[MOCK] fan timer STATUS — not real hardware");
    publishFanStatus(lastFanCommandId);
  }
  publishGarbage();
}, 1000);

if (!shouldPublishOffline) {
  eventTimer = setInterval(() => {
    if (!connected) return;
    const granted = Math.random() >= 0.35;
    publish(MQTT_TOPICS.deviceEvents, {
      version: 1,
      messageType: "EVENT",
      slaveId: "slave_1",
      device: granted ? "ACCESS_GRANTED" : "ACCESS_DENIED",
      data: { tag: granted ? "MOCK-A3F2" : "MOCK-UNKNOWN" },
      message: `[MOCK] RFID access ${granted ? "granted" : "denied"}`
    });
    console.log(`[MOCK] emitted RFID ${granted ? "granted" : "denied"} event`);
  }, 15_000);
}

function shutdown(signal) {
  console.log(`[MOCK] ${signal}; publishing offline and stopping`);
  if (connected) availability("OFFLINE");
  clearInterval(heartbeatTimer);
  clearInterval(pumpTimer);
  clearInterval(eventTimer);
  client.end(false, {}, () => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
