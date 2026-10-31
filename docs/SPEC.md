# HOM​​EMATE — COMPLETE PROJECT SPECIFICATION AND SOFTWARE DEVELOPMENT PROMPT

## 1. Project Overview

Act as a senior full-stack developer and IoT software engineer. Help me develop **HomeMate**, an AI-powered smart home automation system that allows users to monitor and control connected home devices using voice commands and a web-based dashboard.

The project is divided between two people:
- My teammate is responsible for hardware development, ESP32 programming, wiring, sensors, actuators and physical device testing.
- I am responsible for software development, including the frontend, backend, MQTT communication, cloud AI integration, dashboard, APIs and software testing.

**The project has a 24-hour development deadline.** Prioritize a working MVP over unnecessary complexity.

Do not change the agreed architecture, technologies, communication strategy or project scope unless I explicitly ask you to.

---

## 2. Finalized Technology Stack

Use the following technologies:

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Responsive web dashboard

### Backend
- Node.js
- Express.js
- JavaScript or TypeScript, keeping the backend consistent
- REST APIs
- Socket.IO for real-time communication

### IoT Communication
- MQTT over TLS for communication between the backend and ESP32-S3 master.
- MQTT.js on the backend.
- ESP-NOW for communication between the ESP32-S3 master and slave ESP32 boards.

### AI
- Cloud-based AI service for natural-language understanding.
- Cloud speech recognition or compatible speech-to-text functionality for voice commands.
- AI-generated responses for user feedback.
- Structured intent extraction before any device command is executed.

### Data Storage
**Do not use any database or persistent storage.**

- No MongoDB.
- No PostgreSQL.
- No MySQL.
- No Firebase.
- No local database.
- No database collections or database configuration.
- Do not implement data persistence.

Use temporary in-memory JavaScript objects and arrays for device states, command tracking and session activity where necessary.

All temporary application data may be lost when the backend restarts. This is intentional.

### Authentication
- No login.
- No registration.
- No user management.
- No authentication system for this MVP.

### Dashboard Appearance
- Support both dark mode and light mode.
- Provide a theme toggle.
- Use a clean, modern, responsive smart-home dashboard design.

---

## 3. Hardware and Device Overview

The hardware architecture is already decided and must not be redesigned.

### ESP32-S3 Master

There is one ESP32-S3 board with a camera.

It acts as the master controller:
- It is the only ESP32 board connected to the internet.
- It communicates with the backend through MQTT.
- It communicates with slave ESP32 boards through ESP-NOW.
- It receives commands from the backend.
- It forwards commands to the correct slave.
- It receives device status and events from slaves.
- It sends the received information back to the backend using MQTT.

The backend must never attempt to communicate directly with the slave ESP32 boards.

### Slave 1 — RFID Door Security

Purpose: Smart door security demonstration.

Expected features:
- Read RFID tags.
- Identify authorized and unauthorized tags.
- Report access granted events.
- Report access denied events.
- Report lock status if a lock actuator is installed and its state is available.
- Send security events through the master to the backend.

The RFID access-control logic remains on the hardware side.

### Slave 2 — Water Pump

Purpose: Smart water pump control.

Expected features:
- Turn pump ON.
- Turn pump OFF.
- Turn pump ON for a specified duration.
- Report current pump state.
- Report remaining operating time.
- Automatically switch OFF after the requested duration.

Example voice command:

"Turn on the water pump for 20 minutes."

The software sends the requested duration to the master, which forwards it to the pump slave.

**Important:** The pump slave must manage its own timer locally. The automatic shutdown must not depend on the dashboard, backend, internet connection or cloud AI. The pump must fail safe to OFF after a slave reboot.

### Slave 3 — Servo / Fan Demonstration

Purpose: Demonstrate fan control through servo positions.

Expected settings:
- OFF
- LOW
- MEDIUM
- HIGH

The dashboard must allow users to select these settings.

The backend sends the requested setting to the master, and the master forwards it to the correct slave.

The slave reports its actual setting or servo angle back through the master.

Do not assume a setting was applied until the reported status confirms it.

### Slave 4 — Reserved

Slave 4 is reserved for future expansion.

For now:
- Show it as reserved or not configured.
- Do not invent additional functionality.
- Keep the software structure expandable.

---

## 4. Finalized System Architecture

Follow this exact communication architecture:

**Frontend → Backend → MQTT Broker → ESP32-S3 Master → ESP-NOW → Slave ESP32**

Feedback travels in the opposite direction:

**Slave ESP32 → ESP-NOW → ESP32-S3 Master → MQTT Broker → Backend → Socket.IO → Frontend**

The frontend must communicate with the backend through REST APIs and Socket.IO.

The backend must communicate with the ESP32-S3 master through MQTT.

The ESP32-S3 master is the only internet-connected ESP32.

Do not introduce another communication architecture, replace ESP-NOW, connect slaves directly to MQTT or allow the backend to communicate directly with slave boards.

---

## 5. MQTT Topic Structure

Use these agreed MQTT topics consistently:

### Backend to Master

`homemate/001/master/command`

Used by the backend to publish commands for the master.

### Master to Backend — Command Results

`homemate/001/master/result`

Used by the master to report command acknowledgements and execution results.

### Master to Backend — Device Status

`homemate/001/devices/status`

Used to publish device status updates.

### Master to Backend — Device Events

`homemate/001/devices/events`

Used to publish RFID events and other device events.

### Master to Backend — Availability

`homemate/001/master/availability`

Used to report master availability and connectivity.

Use MQTT over TLS. Use QoS 1 for command delivery where appropriate, and implement application-level acknowledgements because MQTT delivery alone does not confirm device execution.

---

## 6. Message Structure and Communication Contract

Use consistent JSON messages between the backend and master.

### Example: Pump Command

```json
{
  "version": 1,
  "commandId": "cmd_001",
  "target": "slave_2",
  "device": "water_pump",
  "action": "SET",
  "parameters": {
    "power": true,
    "durationSeconds": 1200
  }
}
```

### Example: Fan Command

```json
{
  "version": 1,
  "commandId": "cmd_002",
  "target": "slave_3",
  "device": "fan",
  "action": "SET",
  "parameters": {
    "level": "MEDIUM"
  }
}
```

### Example: Device Status

```json
{
  "version": 1,
  "commandId": "cmd_001",
  "slaveId": "slave_2",
  "messageType": "STATUS",
  "device": "water_pump",
  "state": {
    "power": true,
    "remainingSeconds": 1190
  }
}
```

### Supported Message Types

- COMMAND
- ACK
- STATUS
- EVENT
- HEARTBEAT

Every command must have a unique command ID.

The master and backend must be able to correlate acknowledgements and results with the corresponding command.

Implement duplicate-command protection where practical.

### Command Lifecycle

Use these command states:

- PENDING
- SENT
- ACKNOWLEDGED
- EXECUTED
- FAILED
- TIMEOUT
- CANCELLED

An ACK means a command was received or accepted. EXECUTED means the device has reported that the requested operation was applied.

Do not treat ACK as proof of successful device execution.

When a device does not provide fresh feedback, show its state as UNKNOWN or OFFLINE instead of assuming it is OFF.

---

## 7. Finalized Software Features

### A. Main Dashboard

Create an attractive HomeMate overview dashboard with:

- HomeMate title and branding.
- Master ESP32 connection status.
- Slave 1, Slave 2 and Slave 3 availability.
- Reserved Slave 4 status.
- Water pump current state.
- Fan current setting.
- Door security status when reported.
- Recent device events received during the current session.
- Active or pending commands.
- Quick-access AI assistant.
- Dark/light theme switch.

The dashboard should update automatically using Socket.IO.

### B. Device Management Page

Create individual device control sections.

**Door Security**
- Show RFID access granted events.
- Show RFID access denied events.
- Show reported lock status when available.
- Show the latest received event.
- Do not create an AI-based RFID authorization bypass.

**Water Pump**
- ON control.
- OFF control.
- Duration input in minutes.
- Display requested duration.
- Display reported remaining time.
- Display reported pump state.
- Show command execution results.
- Display a clear UNKNOWN or OFFLINE state when feedback is unavailable.

**Fan / Servo**
- OFF button.
- LOW button.
- MEDIUM button.
- HIGH button.
- Show the requested setting.
- Show the latest reported setting.
- Show the servo angle when supplied by the slave.

**Slave 4**
- Display as reserved or not configured.

### C. AI Voice Assistant

This is one of the main HomeMate features.

Users should be able to interact with HomeMate using natural-language commands.

Example commands:

- "Turn on the water pump for 20 minutes."
- "Turn off the water pump."
- "Set the fan to low."
- "Set the fan to medium."
- "Set the fan to high."
- "Turn off the fan."
- "What is the current pump status?"
- "What is the fan currently set to?"
- "Show the latest security events."

The AI system should:

1. Receive typed or transcribed voice input.
2. Understand the user's intention.
3. Extract the target device.
4. Extract the requested action.
5. Extract parameters such as pump duration or fan level.
6. Return a structured intent.
7. Pass the intent to backend validation.
8. Execute the command only if it passes validation.
9. Return a clear result to the user.

Example structured intent:

```json
{
  "intent": "CONTROL_DEVICE",
  "device": "water_pump",
  "action": "SET",
  "parameters": {
    "power": true,
    "durationSeconds": 1200
  }
}
```

Do not allow the AI to publish arbitrary MQTT messages or bypass backend validation.

The backend must use an allowlist of supported devices, actions and parameters.

### D. Voice Interaction

Support cloud-based speech recognition or compatible cloud audio processing.

The user should be able to:
- Activate voice input.
- Speak a command.
- Receive a text interpretation.
- See whether the command is accepted or rejected.
- Receive a clear execution result.

Support spoken responses through an appropriate text-to-speech or speaker integration where the hardware communication interface supports it.

Keep the hardware-side microphone, speaker and display integration coordinated with the hardware developer. Do not invent a new hardware protocol.

If a voice command cannot be interpreted confidently, ask the user to clarify rather than issuing an uncertain device command.

### E. Activity and Event Monitoring

Display events as they arrive.

Examples:
- RFID access granted.
- RFID access denied.
- Pump switched ON.
- Pump switched OFF.
- Fan setting changed.
- Command acknowledged.
- Command executed.
- Command timed out.
- Master disconnected.
- Slave unavailable.

Because there is no database, activity history is temporary.

Events may be kept in an in-memory array while the backend is running and should be sent to connected dashboard clients.

Do not claim that history is permanently saved.

### F. Live Device Monitoring

Use Socket.IO to update:
- Device status.
- Device availability.
- Master availability.
- New security events.
- Command state changes.
- Pump remaining time.
- Fan setting.
- Communication errors.

The dashboard should not require manual refreshes to receive new updates.

---

## 8. Backend Responsibilities

Build the backend as a single modular Express application. Do not create microservices.

Organize the backend into these modules:

```text
backend/
└── src/
    ├── config/
    ├── mqtt/
    │   ├── client.js
    │   └── handlers.js
    ├── devices/
    │   └── device.service.js
    ├── commands/
    │   ├── command.routes.js
    │   └── command.service.js
    ├── ai/
    │   └── ai.service.js
    ├── events/
    │   └── event.service.js
    ├── sockets/
    │   └── socket.js
    ├── middleware/
    ├── app.js
    └── server.js
```

### MQTT Module
- Connect to the MQTT broker.
- Subscribe to master result, status, event and availability topics.
- Publish commands to the master.
- Parse and validate incoming JSON messages.
- Handle disconnects and reconnections.
- Track MQTT connection state.

### Device Module
- Maintain the latest device states in memory.
- Maintain online/offline/unknown status.
- Update device state when reports arrive.
- Expose device information to the frontend.
- Do not assume commands succeeded without device feedback.

### Command Module
- Create unique command IDs.
- Validate requested device and action.
- Publish commands to MQTT.
- Track command lifecycle in memory.
- Process acknowledgements and execution results.
- Handle timeouts.
- Return command status to the frontend.

### AI Module
- Connect to the selected cloud AI provider.
- Interpret natural-language requests.
- Extract structured intent.
- Validate the response format.
- Reject unsupported actions.
- Never let the AI directly bypass command validation.

Keep API keys and secrets on the backend in environment variables. Never expose cloud AI keys, MQTT credentials or broker secrets in frontend code.

### Event Module
- Process device events.
- Maintain temporary event history in memory.
- Broadcast new events.
- Do not write event data to a database or persistent file.

### Socket Module
- Initialize Socket.IO.
- Broadcast real-time device updates.
- Broadcast command updates.
- Broadcast device and security events.
- Broadcast master connectivity updates.

---

## 9. Backend API Endpoints

Create these initial REST endpoints.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/dashboard` | Get current dashboard data |
| GET | `/api/devices` | Get configured devices |
| GET | `/api/devices/:id/status` | Get latest device status |
| GET | `/api/devices/:id/history` | Get temporary device history |
| POST | `/api/commands` | Validate and issue a device command |
| GET | `/api/commands/:id` | Get temporary command status |
| GET | `/api/events` | Get temporary event history |
| POST | `/api/ai/command` | Interpret and validate an AI request |

These endpoints should work with in-memory application state.

Do not add database-backed functionality.

### Socket.IO Events

Use consistent event names:

```text
device:status
device:availability
device:event
command:updated
master:status
```

The frontend should subscribe to these events and update its state automatically.

---

## 10. Frontend Project Structure

Use a clear Next.js project structure:

```text
frontend/
├── app/
│   ├── page.tsx
│   ├── devices/
│   │   └── page.tsx
│   ├── activity/
│   │   └── page.tsx
│   ├── assistant/
│   │   └── page.tsx
│   └── settings/
│       └── page.tsx
│
├── components/
│   ├── layout/
│   ├── dashboard/
│   ├── devices/
│   ├── assistant/
│   ├── activity/
│   └── ui/
│
├── hooks/
├── services/
├── types/
└── public/
```

### Required Pages

**Overview**
- System status.
- Device summary cards.
- Master and slave availability.
- Recent activity.
- AI assistant shortcut.

**Devices**
- Door security.
- Water pump controls.
- Fan controls.
- Reserved Slave 4.

**Activity**
- Temporary event history.
- Command outcomes.
- RFID events.
- Connection and communication events.

**AI Assistant**
- Text input.
- Voice input.
- Interpreted command.
- Command execution feedback.
- AI response.

**Settings**
- Dark/light theme selection.
- Basic dashboard preferences.

Do not build login, registration or user-management pages.

---

## 11. In-Memory State Management

Since HomeMate must not use a database, use backend memory for temporary state.

Examples:

```javascript
const devices = {
  slave_1: {
    device: "door_security",
    availability: "UNKNOWN",
    state: {}
  },
  slave_2: {
    device: "water_pump",
    availability: "UNKNOWN",
    state: {}
  },
  slave_3: {
    device: "fan",
    availability: "UNKNOWN",
    state: {}
  },
  slave_4: {
    device: "reserved",
    availability: "NOT_CONFIGURED",
    state: {}
  }
};

const commands = new Map();

const events = [];
```

Adapt these examples into properly structured modules.

Important rules:
- Initialize device states as UNKNOWN until valid status arrives.
- Update states only from valid reported data.
- Give commands unique IDs.
- Keep command records temporarily.
- Set reasonable limits on temporary event history.
- Clear temporary history and command tracking when the process restarts.
- Never claim that data has been permanently saved.

The frontend may also maintain temporary UI state, but the backend remains the central source for the latest device state received from the master.

---

## 12. Safety, Reliability and Validation

Implement the following rules:

1. Validate every device command on the backend.
2. Only accept known device IDs and supported actions.
3. Validate pump duration and fan setting parameters.
4. Use unique command IDs.
5. Handle duplicate commands where practical.
6. Track command acknowledgements separately from execution results.
7. Handle MQTT disconnects and reconnections.
8. Handle commands that time out.
9. Show UNKNOWN or OFFLINE when device information is unavailable or stale.
10. Do not report a device as successfully controlled before receiving confirmation.
11. Keep pump timing and automatic shutdown local to the pump slave.
12. Never allow cloud AI to bypass RFID security.
13. Keep secrets in backend environment variables.
14. Do not expose an unauthenticated control API to the public internet. Since authentication is intentionally omitted, keep the demonstration system on a trusted network or otherwise appropriately restricted environment.

---

## 13. Environment Configuration

Use environment variables for configuration.

Example backend `.env`:

```env
PORT=5000

MQTT_BROKER_URL=
MQTT_USERNAME=
MQTT_PASSWORD=

CLOUD_AI_API_KEY=
CLOUD_AI_MODEL=

FRONTEND_URL=
```

Use a separate frontend environment variable for the backend API base URL.

Do not commit `.env` files or secrets to source control.

Do not add database environment variables or database connection code.

---

## 14. Finalized MVP Acceptance Criteria

The software MVP should be considered ready for demonstration when:

1. The Next.js dashboard loads successfully.
2. Dark and light themes work.
3. The backend starts successfully without a database.
4. The backend connects to the MQTT broker.
5. The backend receives messages from the ESP32-S3 master.
6. The backend can publish commands to the master.
7. Device status is maintained in memory.
8. Pump ON/OFF control works.
9. Pump duration commands are supported.
10. Pump remaining time can be displayed from reported status.
11. Fan OFF/LOW/MEDIUM/HIGH control works.
12. RFID events appear on the dashboard.
13. Socket.IO updates the dashboard in real time.
14. The AI understands supported natural-language commands.
15. AI-generated commands pass backend validation.
16. Command acknowledgements and execution outcomes are displayed separately.
17. Timeouts and offline states are handled correctly.
18. No database or authentication system has been introduced.

---

## 15. Implementation Priority for the 24-Hour Deadline

Work in this order:

### Priority 1 — Project Foundation
- Create Next.js frontend.
- Create Express backend.
- Configure environment variables.
- Set up Socket.IO.
- Establish the project structure.

### Priority 2 — MQTT Communication
- Connect the backend to the MQTT broker.
- Subscribe to the agreed topics.
- Receive messages from the master.
- Publish test commands to the master.
- Validate message structures.

### Priority 3 — Device and Command Management
- Create in-memory device state.
- Implement command IDs.
- Build the command API.
- Implement acknowledgement and execution tracking.
- Implement timeouts and availability states.

### Priority 4 — Dashboard
- Create the overview page.
- Create device cards and controls.
- Create door security and activity sections.
- Add dark/light mode.
- Connect Socket.IO.

### Priority 5 — Cloud AI
- Integrate cloud AI.
- Implement structured intent extraction.
- Add backend validation.
- Connect typed commands.
- Add voice recognition.
- Add user feedback.

### Priority 6 — Integration Testing
- Test communication with the actual master.
- Test pump control and duration.
- Test fan control.
- Test RFID events.
- Test command failures and timeouts.
- Test real-time dashboard updates.
- Test the complete voice-to-command flow.

Finish the core device communication and control flows before spending time on optional visual effects or advanced features.

---

## Appendix A — Fan timer (TBC)

The optional fan timer is **TBC with the hardware developer** and is not tested against real hardware. A fan SET command may include `durationSeconds` only for LOW, MEDIUM, or HIGH; it must be 60–7200 seconds. OFF must not include a duration. Missing duration means run until changed. The fan slave owns the countdown and reports `remainingSeconds` in STATUS; the backend must not run a fallback timer.

---

## 16. Instructions for the AI Developer

Follow these development rules throughout the project:

- Treat this specification as the finalized project scope.
- Do not change the architecture or technology stack.
- Do not add a database or persistent data storage.
- Do not add login, authentication or registration.
- Do not replace MQTT or ESP-NOW.
- Do not make the backend communicate directly with slave ESP32 boards.
- Do not invent hardware wiring or change the hardware architecture.
- Do not invent MQTT topics or silently change message formats.
- Coordinate any additional hardware message requirements with the hardware developer.
- Keep the code modular, understandable and easy to debug.
- Avoid unnecessary abstractions and complicated infrastructure.
- Prioritize functional code that can be tested with the actual ESP32 master.
- Implement features in the specified order.
- Provide complete file contents when asked to create a file.
- Include setup instructions and commands for running the frontend and backend.
- Explain exactly where environment variables must be configured.
- Handle errors instead of silently ignoring them.
- Do not pretend a hardware integration has been tested unless it has actually been tested.
- When an external service or hardware interface is not configured, provide a clearly identified mock or test mode without presenting it as a successful real integration.

**Most importantly: Preserve the finalized HomeMate architecture and scope. We have only 24 hours to complete the software MVP, so focus on implementation, integration and a reliable demonstration rather than redesigning the project.**

---

# END OF HOM​​EMATE PROJECT SPECIFICATION