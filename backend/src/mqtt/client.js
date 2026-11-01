import mqtt from "mqtt";
import { config } from "../config/index.js";
import { emitMasterStatus } from "../sockets/socket.js";
import { commandService } from "../commands/command.service.js";
import { deviceService } from "../devices/device.service.js";
import { mqttHandlers } from "./handlers.js";
import { topics } from "./contract.js";
import { mqttInspector as defaultInspector } from "./debug-inspector.js";

export function createMqttClient({
  brokerUrl = config.MQTT_BROKER_URL,
  username = config.MQTT_USERNAME,
  password = config.MQTT_PASSWORD,
  commands = commandService,
  devices = deviceService,
  handlers = mqttHandlers,
  mqttConnect = mqtt.connect,
  clientId = `homemate-backend-${process.pid}`,
  inspector
} = {}) {
  let connectionState = "DISCONNECTED";
  let lastMessageAt;
  const mqttInspector = inspector ?? defaultInspector;
  const subscribedTopics = [topics.result, topics.deviceStatus, topics.deviceEvents, topics.masterAvailability];
  const client = mqttConnect(brokerUrl, {
    clientId,
    username,
    password,
    protocol: "mqtts",
    reconnectPeriod: 1_000,
    clean: true
  });

  function setConnectionState(availability) {
    connectionState = availability;
    if (availability === "ONLINE") devices.updateMasterAvailability("ONLINE");
    else devices.markAllUnknown();
    emitMasterStatus({ availability, lastSeen: devices.getSnapshot().master.lastSeen });
  }

  client.on("connect", () => {
    console.log(`MQTT connected to ${new URL(brokerUrl).host}`);
    client.subscribe(subscribedTopics, { qos: 1 }, (error) => {
      if (error) {
        console.error("MQTT subscription failed", error);
        setConnectionState("UNKNOWN");
        return;
      }
      console.log(`MQTT subscribed to ${subscribedTopics.join(", ")}`);
      setConnectionState("ONLINE");
    });
  });

  client.on("reconnect", () => {
    connectionState = "CONNECTING";
    emitMasterStatus({ availability: "UNKNOWN" });
  });

  client.on("offline", () => setConnectionState("UNKNOWN"));
  client.on("close", () => setConnectionState("UNKNOWN"));
  client.on("error", (error) => console.error("MQTT client error", error));

  client.on("message", (topic, payload) => {
    lastMessageAt = new Date().toISOString();
    let messageType = "UNKNOWN";
    try {
      messageType = JSON.parse(payload.toString())?.messageType ?? messageType;
    } catch {
      // The handler logs malformed JSON; keep this transport log safe and concise.
    }
    console.log(`MQTT ${topic} ${messageType}`);
    let handler = "unrouted";
    try {
      if (topic === topics.result) { handler = "handleResult"; handlers.handleResult(payload); }
      else if (topic === topics.deviceStatus) { handler = "handleStatus"; handlers.handleStatus(payload); }
      else if (topic === topics.deviceEvents) { handler = "handleEvent"; handlers.handleEvent(payload); }
      else if (topic === topics.masterAvailability) { handler = "handleAvailability"; handlers.handleAvailability(payload); }
    } catch (error) {
      console.error("MQTT message handler failed", error);
    } finally {
      mqttInspector.record({ topic, payload, handler });
    }
  });

  function publishCommand(command) {
    if (connectionState !== "ONLINE" || !client.connected) {
      const error = new Error("HomeMate is not connected to the master broker");
      commands.fail?.(command.id, error.message);
      throw error;
    }

    const message = {
      version: 1,
      commandId: command.id,
      target: command.deviceId,
      device: command.deviceId === "slave_2" ? "water_pump" : "fan",
      action: command.action,
      parameters: command.parameters
    };
    return new Promise((resolve, reject) => {
      client.publish(topics.command, JSON.stringify(message), { qos: 1, retain: false }, (error) => {
        if (error) {
          commands.fail?.(command.id, `Could not send command: ${error.message}`);
          reject(error);
          return;
        }
        resolve(commands.markSent(command.id));
      });
    });
  }

  return {
    client,
    publishCommand,
    getConnectionState: () => connectionState,
    getLastMessageAt: () => lastMessageAt,
    close: () => client.end()
  };
}

export const mqttClient = createMqttClient();
export const { publishCommand } = mqttClient;
