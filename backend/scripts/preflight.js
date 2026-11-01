import mqtt from "mqtt";
import { config } from "../src/config/index.js";
import { createAiService } from "../src/ai/ai.service.js";
import { topics } from "../src/mqtt/contract.js";
import { execSync } from "node:child_process";

const { MQTT_BROKER_URL, MQTT_USERNAME, MQTT_PASSWORD, CLOUD_AI_PROVIDER, CLOUD_AI_KEY, FRONTEND_URL } = config;

const checks = {
  envVars: "FAIL",
  brokerReachable: "FAIL",
  mqttLogin: "FAIL",
  topicsSubscribable: "FAIL",
  masterOnline: "FAIL",
  aiKeyValid: "FAIL",
  frontendReachable: "FAIL"
};

function printStatus() {
  console.log("\nPreflight check results:");
  Object.entries(checks).forEach(([name, status]) => {
    console.log(`${name.padEnd(20)} ${status}`);
  });
  const allPassed = Object.values(checks).every((status) => status === "PASS");
  console.log(`\n${allPassed ? "✅ All checks passed" : "❌ Some checks failed"}`);
  if (!allPassed) {
    console.log("\nNext steps: check the failed checks and update the configuration.");
  }
}

async function runChecks() {
  // Check required env vars
  checks.envVars = MQTT_BROKER_URL && MQTT_USERNAME && MQTT_PASSWORD && CLOUD_AI_PROVIDER && CLOUD_AI_KEY && FRONTEND_URL ? "PASS" : "FAIL";

  // Check broker reachability
  try {
    const url = new URL(MQTT_BROKER_URL);
    const { hostname, port } = url;
    const response = await fetch(`http://${hostname}:${port}`);
    checks.brokerReachable = response.ok ? "PASS" : "FAIL";
  } catch {
    checks.brokerReachable = "FAIL";
  }

  // Check MQTT login and topic subscription
  const client = mqtt.connect(MQTT_BROKER_URL, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    protocol: "mqtts",
    reconnectPeriod: 1_000,
    clean: true
  });

  await new Promise((resolve) => {
    client.on("connect", () => {
      checks.mqttLogin = "PASS";
      client.subscribe(topics.masterAvailability, { qos: 1 }, (error) => {
        checks.topicsSubscribable = error ? "FAIL" : "PASS";
        client.end();
        resolve();
      });
    });
    client.on("error", () => {
      checks.mqttLogin = "FAIL
      checks.topicsSubscribable = "FAIL";
      client.end();
      resolve();
    });
  });

  // Check master availability
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      checks.masterOnline = "FAIL";
      resolve();
    }, 15_000);

    client.on("message", (topic, payload) => {
      if (topic === topics.masterAvailability) {
        try {
          const message = JSON.parse(payload.toString());
          if (message.messageType === "HEARTBEAT" && message.status === "ONLINE") {
            checks.masterOnline = "PASS";
          }
        } catch {}
      }
    });

    client.on("connect", () => {
      client.subscribe(topics.masterAvailability, { qos: 1 });
    });

    client.on("end", () => {
      clearTimeout(timeout);
      resolve();
    });
  });

  // Check AI key validity
  try {
    const aiService = createAiService();
    await aiService.answerFromIntent("What is the capital of France?", "groq");
    checks.aiKeyValid = "PASS";
  } catch {
    checks.aiKeyValid = "FAIL";
  }

  // Check frontend reachability
  try {
    const response = await fetch(FRONTEND_URL);
    checks.frontendReachable = response.ok ? "PASS" : "FAIL";
  } catch {
    checks.frontendReachable = "FAIL";
  }

  printStatus();
}

runChecks();