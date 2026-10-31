# HomeMate Permanent Rules

## Scope and Stack

- Frontend uses Next.js with the App Router, React, TypeScript, Tailwind CSS, shadcn/ui, `socket.io-client`, `lucide-react`, and `next-themes`.
- Backend, when built, lives in `/backend` and uses Node.js, Express, plain JavaScript with ES modules, `mqtt`, `socket.io`, `dotenv`, `cors`, and `zod`.
- Do not add a database, authentication, login pages, registration, or persistence. Backend state is held in memory only; do not write data files.
- Do not use `localStorage` for device data.

## Backend Rules

- The backend talks only to the master through MQTT on the agreed topics. It must never communicate directly with slave devices.
- AI returns structured intent only. Backend allowlist validation decides what may run; AI never publishes MQTT.
- ACK is not EXECUTED. Never mark a command `EXECUTED` without a matching device status report.
- Keep secrets only in `backend/.env`. Never expose backend secrets in frontend code.

## Architecture and State

- The frontend communicates only with the backend through REST and Socket.IO.
- Never communicate with MQTT or hardware from frontend code.
- Device state is `UNKNOWN` or `OFFLINE` until reported. Never assume `OFF`.
- A command ACK is not execution. Display `Received` (`ACKNOWLEDGED`) and `Done` (`EXECUTED`) as visually different steps.
- Do not invent hardware details or fake metrics.

## UI Language

- Use plain, everyday language in the UI.
- Do not expose technical jargon such as GPIO, MQTT, ESP32, latency, pins, or error codes.

## Design System

- Match `docs/design/component-sheet.png`: minimal dark glassmorphism.
- Background: `#0B1020` with one soft violet glow.
- Glass cards: `rgba(255,255,255,0.05)`, `blur(16px)`, 1px border `rgba(255,255,255,0.10)`, 20px radius.
- Use Inter and a single cyan accent: `#38BDF8`.
- Status colors always include both an icon and a word: green Online/Done, amber Working, red Failed, gray Unknown/Offline.
- Controls must be at least 44px tall.
- Dark and light themes must work through CSS variable tokens.

## Required Frontend Structure

```text
frontend/
├── app/
│   ├── page.tsx
│   ├── devices/page.tsx
│   ├── activity/page.tsx
│   ├── assistant/page.tsx
│   ├── settings/page.tsx
│   └── ...
├── components/{layout,dashboard,devices,assistant,activity,ui}/
├── hooks/
├── services/
├── types/
└── public/
```

## Environment and Git

- `frontend/.env.example` must contain:
  - `NEXT_PUBLIC_API_URL=http://localhost:5000`
  - `NEXT_PUBLIC_MOCK_MODE=true`
- Exclude `.env` files from version control.
