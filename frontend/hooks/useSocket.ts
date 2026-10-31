"use client";

import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { createHomeMateSocket, type SocketEvents } from "@/services/socket";

export type SocketConnectionState = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR";

export function useSocket(handlers: Partial<Pick<SocketEvents, "device:status" | "device:availability" | "device:event" | "command:updated" | "master:status" | "snapshot">>, enabled = true) {
  const [connectionState, setConnectionState] = useState<SocketConnectionState>(enabled ? "CONNECTING" : "DISCONNECTED");

  useEffect(() => {
    if (!enabled) return;
    const socket = createHomeMateSocket();
    setTimeout(() => setConnectionState("CONNECTING"), 0);
    socket.on("connect", () => setConnectionState("CONNECTED"));
    socket.on("disconnect", () => setConnectionState("DISCONNECTED"));
    socket.on("connect_error", () => setConnectionState("ERROR"));
    (Object.entries(handlers) as [keyof typeof handlers, NonNullable<(typeof handlers)[keyof typeof handlers]>][]).forEach(([event, handler]) => socket.on(event as never, handler as never));
    socket.connect();
    return () => { socket.removeAllListeners(); socket.disconnect(); setConnectionState("DISCONNECTED"); };
  }, [enabled, handlers]);

  return { socket: null as Socket<SocketEvents> | null, connectionState };
}
