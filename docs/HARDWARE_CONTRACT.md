# HomeMate Hardware Contract

Generated from the current backend code: `src/mqtt/contract.js`, its Zod schemas,
`src/commands/command.service.js`, `src/config/index.js`, `src/mqtt/client.js`, and
`scripts/mock-master.js`.

This document separates **Implemented today** from **Proposal / TBC**. It contains no
credentials. It intentionally does not define voice or display messages; those remain
undecided.

---

## 1. Topics, participants, and QoS

The backend communicates with the master only. It does not connect directly to slave
devices.

| Topic | Publisher | Subscriber | QoS | Status |
|---|---|---|---:|---|
| `homemate/001/master/command` | Backend | Master; mock master subscribes here | 1 | Implemented in backend and mock |
| `homemate/001/master/result` | Master | Backend | 1 subscription; publish QoS 1 in mock | Implemented in backend/mock |
| `homemate/001/devices/status` | Master | Backend | 1 subscription; publish QoS 1 in mock | Implemented in backend/mock |
| `homemate/001/devices/events` | Master | Backend | 1 subscription; publish QoS 1 in mock | Implemented in backend/mock |
| `homemate/001/master/availability` | Master | Backend | 1 subscription; publish QoS 1 in mock | Implemented in backend/mock |

The backend subscribes to exactly four topics on connect: `result`, `deviceStatus`,
`deviceEvents`, and `masterAvailability`. The backend publishes commands with
`{ qos: 1, retain: false }`. The mock master subscribes to `command` with QoS 1 and
publishes its messages with QoS 1 and `retain: false`.

**Note:** The backend does **not** include `messageType` in the outbound COMMAND
envelope (see §3.1). The schema in `contract.js` validates only *inbound* messages
and does not validate an outbound `COMMAND`.

---

## 2. Schema conventions

The incoming `messageSchema` is strict (`.strict()` in Zod): unknown fields are
rejected and the entire message is dropped.

### Common incoming fields

| Field | Type | Required by schema | Notes |
|---|---|---:|---|
| `version` | number literal | Yes | Must be `1`. |
| `messageType` | string enum | Yes | `COMMAND`, `ACK`, `FAILED`, `STATUS`, `EVENT`, or `HEARTBEAT`. |
| `commandId` | non-empty string | No | Required operationally for ACK/FAILED and command-completing STATUS. |
| `slaveId` | enum string | No | `slave_1`, `slave_2`, `slave_3`, `slave_4`. |
| `device` | non-empty string | No | Device/event identifier. |
| `state` | object | No | See state fields below. |
| `result` | enum string | No | `ACK` or `FAILED`. |
| `status` | enum string | No | `ACK`, `FAILED`, `ONLINE`, or `OFFLINE`. |
| `success` | boolean | No | Used by result handling. |
| `message` | string | No | Human-readable text. |
| `data` | object | No | Arbitrary JSON-valued event data. |

Accepted `state` sub-fields (all optional inside `state`):

| Field | Type | Allowed values |
|---|---|---|
| `power` | boolean | Pump on/off state. |
| `remainingSeconds` | integer | Reported remaining time. |
| `level` | string enum | `OFF`, `LOW`, `MEDIUM`, `HIGH`. |
| `angle` | integer | Fan angle. |
| `locked` | boolean | Door lock state. |

---

## 3. Message examples

Each example includes every field used by that message shape. The tables state the
type and whether the field is required for the backend to process that message.
"Schema optional" means Zod accepts omission; "operationally required" means the
relevant handler needs it for the intended behavior.

### 3.1 COMMAND — pump, Backend → Master

**Implemented today:** The backend publishes this shape after the command validator
accepts it. The master/mock master subscribes to this topic.

> **Important:** The outbound COMMAND envelope does **not** include `messageType`.
> The field is absent in `mqtt/client.js`. See OQ-2 for the open question on whether
> the real master requires it.

```json
{
  "version": 1,
  "commandId": "cmd_7f4f8d1e-...",
  "target": "slave_2",
  "device": "water_pump",
  "action": "SET",
  "parameters": {
    "power": true,
    "durationSeconds": 1200
  }
}
```

| Field | Type | Required | Meaning |
|---|---|---:|---|
| `version` | number | Yes | Always `1`. |
| `commandId` | string | Yes | Backend-generated UUID-based command ID (`cmd_<uuid>`). |
| `target` | string | Yes | `slave_2` for the pump or `slave_3` for the fan. Derived from `command.deviceId` in `client.js`. |
| `device` | string | Yes | `water_pump` when `target` is `slave_2`; `fan` when `target` is `slave_3`. |
| `action` | string | Yes | Always `SET`. |
| `parameters` | object | Yes | Validated pump/fan parameters (see §5). |

For a pump-off command, `parameters` is `{ "power": false }`; `durationSeconds` must
be omitted.

### 3.2 COMMAND — fan with optional timer, Backend → Master

**Implemented today in validator and mock; fan timer hardware behavior is
Proposal / TBC.**

```json
{
  "version": 1,
  "commandId": "cmd_9a1b2c3d-...",
  "target": "slave_3",
  "device": "fan",
  "action": "SET",
  "parameters": {
    "level": "LOW",
    "durationSeconds": 1800
  }
}
```

| Field | Type | Required | Meaning |
|---|---|---:|---|
| `version` | number | Yes | `1`. |
| `commandId` | string | Yes | Backend command ID. |
| `target` | string | Yes | `slave_3`. |
| `device` | string | Yes | `fan`. |
| `action` | string | Yes | `SET`. |
| `parameters.level` | string enum | Yes | `OFF`, `LOW`, `MEDIUM`, or `HIGH`. |
| `parameters.durationSeconds` | integer | No | 60–7200; allowed only for `LOW`, `MEDIUM`, or `HIGH`. Forbidden with `OFF`. |

Missing `durationSeconds` means run until changed. `OFF` must not contain it.

### 3.3 ACK — Master → Backend

**Implemented today:** The backend handles this on `homemate/001/master/result`.
`handleResult` routes to `commands.handleAck()` when `messageType === "ACK"` and
`commandId` is present.

```json
{
  "version": 1,
  "messageType": "ACK",
  "commandId": "cmd_7f4f8d1e-...",
  "result": "ACK",
  "status": "ACK",
  "success": true,
  "message": "Command acknowledged by master"
}
```

| Field | Type | Required | Meaning |
|---|---|---:|---|
| `version` | number | Yes | `1`. |
| `messageType` | string | Yes | `ACK`. |
| `commandId` | string | Operationally yes; schema optional | Must match an active command ID. Without it the message is dropped by `handleResult`. |
| `result` | string enum | No | If present, must be `ACK` or `FAILED`; `ACK` here. |
| `status` | string enum | No | If present, must be `ACK`. |
| `success` | boolean | No | Normally `true`. |
| `message` | string | No | Optional human-readable text. |

### 3.4 FAILED — Master → Backend

**Implemented today:** The backend handles this on `homemate/001/master/result`.
A message is treated as FAILED if any of `result === "FAILED"`, `status === "FAILED"`,
or `success === false` is true (checked in `isFailedResult()` in `handlers.js`).

```json
{
  "version": 1,
  "messageType": "FAILED",
  "commandId": "cmd_7f4f8d1e-...",
  "status": "FAILED",
  "success": false,
  "message": "Master reported a failure"
}
```

| Field | Type | Required | Meaning |
|---|---|---:|---|
| `version` | number | Yes | `1`. |
| `messageType` | string | Yes | `FAILED`. |
| `commandId` | string | Operationally yes; schema optional | Must match an active command ID. Without it the message is dropped. |
| `result` | string enum | No | If present, `FAILED`. |
| `status` | string enum | No | If present, `FAILED`. |
| `success` | boolean | No | `false` also triggers FAILED path independently. |
| `message` | string | No | Displayed to the user as the failure reason. |

### 3.5 STATUS — pump, Master → Backend

**Implemented today:** The mock publishes this after a pump command and during pump
countdown. A STATUS without `commandId` is a device-state refresh only and cannot
complete a command.

```json
{
  "version": 1,
  "messageType": "STATUS",
  "commandId": "cmd_7f4f8d1e-...",
  "slaveId": "slave_2",
  "device": "water_pump",
  "state": {
    "power": true,
    "remainingSeconds": 1199
  }
}
```

| Field | Type | Required | Meaning |
|---|---|---:|---|
| `version` | number | Yes | `1`. |
| `messageType` | string | Yes | `STATUS`. |
| `commandId` | string | Required to complete a command; otherwise no | Matching active command ID. Without it, device state is refreshed but no command transitions to EXECUTED. |
| `slaveId` | enum string | Operationally yes; schema optional | `slave_2`. Required by `handleStatus` to route the update to the correct device. |
| `device` | string | No | `water_pump`. Updates the stored device identifier. |
| `state` | object | Operationally yes for useful status; schema optional | `power` boolean; `remainingSeconds` integer (optional). |

For pump execution, the backend compares `state.power` against the requested `power`.
`remainingSeconds` is stored but not used for command matching.

### 3.6 STATUS — fan with timer, Master → Backend

**Status matching is implemented today. Fan timer in real hardware is
Proposal / TBC.**

```json
{
  "version": 1,
  "messageType": "STATUS",
  "commandId": "cmd_9a1b2c3d-...",
  "slaveId": "slave_3",
  "device": "fan",
  "state": {
    "level": "LOW",
    "remainingSeconds": 1800,
    "angle": 45
  }
}
```

| Field | Type | Required | Meaning |
|---|---|---:|---|
| `version` | number | Yes | `1`. |
| `messageType` | string | Yes | `STATUS`. |
| `commandId` | string | Required to complete a command; otherwise no | Matching active command ID. |
| `slaveId` | enum string | Operationally yes; schema optional | `slave_3`. |
| `device` | string | No | `fan`. |
| `state.level` | enum string | Required to complete a fan command | `OFF`, `LOW`, `MEDIUM`, or `HIGH`. Must match the requested level. |
| `state.remainingSeconds` | integer | Required to complete a timed fan command; otherwise no | Must equal the originally requested `durationSeconds` (not a decremented value). |
| `state.angle` | integer | No | Optional fan angle; stored in device state. |

For a fan command without `durationSeconds`, execution requires matching `level` only.
For a timed fan command, execution requires both matching `level` and
`remainingSeconds === durationSeconds` (exact equality, not decremented).

### 3.7 STATUS — door, Master → Backend

**Implemented today in schema, mock, and device state handling.**

```json
{
  "version": 1,
  "messageType": "STATUS",
  "slaveId": "slave_1",
  "device": "door_security",
  "state": {
    "locked": true
  }
}
```

| Field | Type | Required | Meaning |
|---|---|---:|---|
| `version` | number | Yes | `1`. |
| `messageType` | string | Yes | `STATUS`. |
| `slaveId` | enum string | Operationally yes; schema optional | `slave_1`. |
| `device` | string | No | `door_security`. |
| `state` | object | Operationally yes for useful status; schema optional | `locked` boolean. |
| `commandId` | string | No | Not used: door is currently read-only; no command targets `slave_1`. |

### 3.8 EVENT — door/RFID event, Master → Backend

**Implemented today:** The mock emits this to `homemate/001/devices/events`; the
backend stores it in in-memory event history (capped at 100 entries).

```json
{
  "version": 1,
  "messageType": "EVENT",
  "slaveId": "slave_1",
  "device": "ACCESS_GRANTED",
  "message": "RFID access granted",
  "data": {
    "tag": "MOCK-A3F2"
  }
}
```

```json
{
  "version": 1,
  "messageType": "EVENT",
  "slaveId": "slave_1",
  "device": "ACCESS_DENIED",
  "message": "RFID access denied",
  "data": {
    "tag": "MOCK-UNKNOWN"
  }
}
```

| Field | Type | Required | Meaning |
|---|---|---:|---|
| `version` | number | Yes | `1`. |
| `messageType` | string | Yes | `EVENT`. |
| `slaveId` | enum string | No | Normally `slave_1`. Used as `deviceId` in the stored event record. |
| `device` | string | No | Used as the event `type`. Current mock uses `ACCESS_GRANTED` or `ACCESS_DENIED`. Defaults to `"DEVICE_EVENT"` if absent. |
| `message` | string | No | Stored as the event message. Defaults to `"Device event received"` if absent. |
| `data` | object | No | Arbitrary JSON data stored with the event. Current mock includes `tag` (string). |

### 3.9 HEARTBEAT — availability ONLINE, Master → Backend

**Implemented today:** Published by the mock at connect and every 10 seconds. Routed
to `handleAvailability`.

```json
{
  "version": 1,
  "messageType": "HEARTBEAT",
  "status": "ONLINE",
  "device": "master"
}
```

| Field | Type | Required | Meaning |
|---|---|---:|---|
| `version` | number | Yes | `1`. |
| `messageType` | string | Yes | `HEARTBEAT`. |
| `status` | enum string | Yes | `ONLINE`; lowercase `online` is also accepted and normalized to `ONLINE`. |
| `device` | string | No | Normally `master`. |
| `slaveId` | enum string | No | If present, availability targets that specific slave instead of the master. |

### 3.10 HEARTBEAT — availability OFFLINE, Master → Backend

**Implemented today for clean mock shutdown; accepted by schema.** Unexpected broker
loss is not an MQTT OFFLINE message — the backend treats broker disconnect as
`UNKNOWN` internally.

```json
{
  "version": 1,
  "messageType": "HEARTBEAT",
  "status": "OFFLINE",
  "device": "master"
}
```

| Field | Type | Required | Meaning |
|---|---|---:|---|
| `version` | number | Yes | `1`. |
| `messageType` | string | Yes | `HEARTBEAT`. |
| `status` | enum string | Yes | `OFFLINE`; lowercase `offline` is also accepted and normalized. |
| `device` | string | No | Normally `master`. |
| `slaveId` | enum string | No | Optional slave-specific offline signal. |

---

## 4. Command lifecycle

**Implemented today** (`command.service.js`):

1. **PENDING** — `commandService.create()` validates the command against
   `commandSchema` (Zod discriminated union on `deviceId`), generates `cmd_<uuid>`,
   stores it, and schedules an ACK timeout (5 s). Duplicate commands for the same
   device with identical parameters while any active command exists are rejected.
2. **SENT** — `publishCommand()` in `mqtt/client.js` succeeds for
   `homemate/001/master/command`. The ACK timeout is rescheduled.
3. **ACKNOWLEDGED** — An incoming `ACK` on `homemate/001/master/result` has a
   matching `commandId` and `messageType === "ACK"`. `handleAck()` performs this
   transition and schedules the execution timeout (15 s).
4. **EXECUTED** — An incoming `STATUS` on `homemate/001/devices/status` has the
   matching `commandId` **and** a `state` matching the requested state (see execution
   matching rules below). `handleStatus()` performs this transition and clears the
   execution timer.
5. **FAILED** — An incoming message on `homemate/001/master/result` has the matching
   `commandId` and any of: `success: false`, `result: "FAILED"`, or
   `status: "FAILED"`. `handleResult()` performs this transition.

Additional backend transitions:

- **TIMEOUT** — No ACK within 5 s of SENT, or no matching execution STATUS within
  15 s of ACKNOWLEDGED. The sweeper fires via `setTimeout`.
- **CANCELLED** — Application-level cancellation via `commandService.cancel(id)`.
- A STATUS without a matching active `commandId` refreshes device state only; it
  cannot transition any command to EXECUTED.
- A STATUS whose reported state does not match `requestedState()` is ignored for
  command matching (device state is still refreshed).

```
PENDING
  │  ACK timeout scheduled (5 s)
  ▼
SENT
  │  ACK received on master/result (messageType === "ACK" + commandId match)
  ▼
ACKNOWLEDGED
  │  Execution timeout scheduled (15 s)
  ▼
EXECUTED  ← STATUS on devices/status with matching commandId and matching state

Any active state ──→ TIMEOUT  (ACK or execution timeout fires)
Any active state ──→ FAILED   (FAILED message on master/result)
Any active state ──→ CANCELLED
```

### Execution matching rules (from `requestedState()` in `command.service.js`)

| Device | Required matching fields in reported `state` |
|---|---|
| `slave_2` (pump) | `power` must equal requested `power`. |
| `slave_3` (fan, no timer) | `level` must equal requested `level`. |
| `slave_3` (fan, with timer) | `level` must equal requested `level` AND `remainingSeconds` must equal requested `durationSeconds` exactly. |

---

## 5. Limits and timeouts

All constants are defined in `src/config/index.js`.

### Pump (`slave_2`)

- `action`: `SET` only.
- `power`: required boolean.
- `power: true` → `durationSeconds` is required.
- `power: false` → `durationSeconds` is forbidden.
- `durationSeconds`: integer, minimum **60 seconds**, maximum **7200 seconds**
  inclusive.

### Fan (`slave_3`)

- `action`: `SET` only.
- `level`: required `OFF`, `LOW`, `MEDIUM`, or `HIGH`.
- `durationSeconds`: optional integer, 60–7200 seconds inclusive.
- `durationSeconds` is forbidden when `level` is `OFF`.
- Omitting `durationSeconds` means run until next command.
- **The backend does not run a fallback fan timer.** The fan slave is expected to own
  the countdown and report `remainingSeconds` in STATUS. *(Proposal / TBC — see
  OQ-4.)*

### Door (`slave_1`)

- Currently read-only. No command targets `slave_1`.
- Door state is reported via STATUS only.

### `slave_4`

- Reserved and `NOT_CONFIGURED` in `device.service.js`. No contract defined.

### Backend timing assumptions

| Assumption | Value | Source constant | Implemented behavior |
|---|---:|---|---|
| Device staleness | 30 000 ms | `STALE_AFTER_MS` | ONLINE devices become UNKNOWN after ≥ 30 s without a STATUS report. |
| Staleness sweep interval | 5 000 ms | `sweepIntervalMs` (default) | The sweeper checks staleness every 5 s; this does not change the 30 s threshold. |
| ACK timeout | 5 000 ms | `ACK_TIMEOUT_MS` | PENDING/SENT commands become TIMEOUT if no ACK arrives within 5 s. |
| Execution timeout | 15 000 ms | `EXECUTION_TIMEOUT_MS` | ACKNOWLEDGED commands become TIMEOUT if no matching STATUS arrives within 15 s. |
| Event history cap | 100 entries | `EVENT_CAP` | Oldest events are discarded when the cap is exceeded. |
| Duration minimum | 60 s | `DEVICE_DURATION_MIN_SECONDS` | Applies to both pump and fan `durationSeconds`. |
| Duration maximum | 7 200 s | `DEVICE_DURATION_MAX_SECONDS` | Applies to both pump and fan `durationSeconds`. |

---

## 6. Open questions for hardware developer

These items are assumptions, proposals, or explicitly TBC. Please answer each one
before treating the proposed contract as final.

### OQ-1 — Result field naming

The backend accepts ACK/FAILED messages that use `result`, `status`, `success`, or
any combination. Should production ACK/FAILED messages use one single canonical
field, or is it acceptable to include all three?

**Answer:**

---

### OQ-2 — Outbound COMMAND envelope

The backend currently publishes COMMAND messages **without** a `messageType` field
(see `mqtt/client.js`). Does the real master require `messageType: "COMMAND"` to be
present, or is the envelope processed without it?

**Answer:**

---

### OQ-3 — Fan timer support (TBC)

Will the real fan slave support optional `durationSeconds` for `LOW`, `MEDIUM`, and
`HIGH` levels, with `durationSeconds` entirely absent for `OFF`?

**Answer:**

---

### OQ-4 — Fan countdown ownership (TBC)

Will the fan slave own the countdown and report decrementing `remainingSeconds` in
each STATUS, rather than the backend running a local timer?

**Answer:**

---

### OQ-5 — Timed fan execution confirmation (TBC)

When a timed fan command is accepted, will the **first** STATUS report the requested
`level` and the **original** requested `durationSeconds` as `remainingSeconds` (not a
decremented value), so the backend can match and mark the command EXECUTED?

**Answer:**

---

### OQ-6 — Device identifiers and state fields

Are `slave_1` / `door_security`, `slave_2` / `water_pump`, and `slave_3` / `fan` the
production identifiers? Are `locked`, `power`, `level`, `angle`, and
`remainingSeconds` the exact production state field names?

**Answer:**

---

### OQ-7 — Door status semantics

Does `door_security.state.locked` use `true` for locked and `false` for unlocked?
Should any additional door state fields be supported (e.g., ajar sensor, battery
level)?

**Answer:**

---

### OQ-8 — Door event vocabulary

Are `ACCESS_GRANTED` and `ACCESS_DENIED` the final production values for `device` in
door EVENT messages? What exact fields should appear in `data` for RFID events (the
mock uses `{ "tag": "<string>" }`)?

**Answer:**

---

### OQ-9 — Heartbeat format and cadence

Should master and optional slave availability use `messageType: "HEARTBEAT"` with
`status: "ONLINE"` / `"OFFLINE"`? What production heartbeat interval should be
guaranteed? (The mock fires every 10 s.)

**Answer:**

---

### OQ-10 — Offline behavior

When the master or broker becomes unavailable, should the production master publish an
explicit OFFLINE heartbeat before disconnecting, or should the backend rely only on
broker-level disconnect detection?

**Answer:**

---

### OQ-11 — Reserved slave_4

Will `slave_4` remain reserved and unconfigured, or will it receive a defined
production device and contract?

**Answer:**

---

### OQ-12 — Real-device timing and safety

What hardware-specific timing, pump safety cutoff, fail-safe, reboot, power-loss, and
actuator limits must the backend respect or enforce before real-hardware acceptance
testing?

**Answer:**

---

The mock master is not real hardware and does not answer these questions. No voice or
display contract is defined here.
