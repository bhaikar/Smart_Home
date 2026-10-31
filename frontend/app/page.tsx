"use client";

import Link from "next/link";
import { ArrowUpRight, Mic, Radio, ShieldCheck, Waves } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusPill, type StatusVariant } from "@/components/ui/status-pill";
import { useHomeMate } from "@/hooks/useHomeMate";
import type { Device } from "@/types";

function statusVariant(device: Device): StatusVariant {
  if (device.availability === "ONLINE") return device.type === "WATER_PUMP" && (device.state as { power?: boolean }).power ? "working" : "online";
  if (device.availability === "OFFLINE") return "offline";
  if (device.availability === "NOT_CONFIGURED") return "not-configured";
  return "unknown";
}

function feedback(device: Device) {
  if (device.availability !== "ONLINE") return "No recent update";
  if (device.type === "WATER_PUMP") { const pump = device.state as { power?: boolean; remainingSeconds?: number }; return pump.power ? `Running · ${Math.floor((pump.remainingSeconds ?? 0) / 60)}:${String((pump.remainingSeconds ?? 0) % 60).padStart(2, "0")} left` : "Off"; }
  if (device.type === "FAN") { const level = (device.state as { level?: string }).level; return level ? `Currently ${level[0] + level.slice(1).toLowerCase()}` : "No recent update"; }
  return (device.state as { lastEvent?: string }).lastEvent ?? "No recent update";
}

function DeviceSummary({ device, icon: Icon }: { device: Device; icon: typeof Radio }) {
  const dim = device.availability === "UNKNOWN" || device.availability === "OFFLINE";
  return <GlassCard className={`glass-hover min-h-[152px] p-5 ${dim ? "glass-dim" : ""}`}><div className="mb-6 flex items-start justify-between gap-3"><div className="flex items-center gap-2.5"><Icon size={17} className="text-[var(--accent)]" /><h2 className="text-sm font-semibold">{device.name}</h2></div><StatusPill variant={statusVariant(device)} /></div><p className="text-xs text-[var(--text-secondary)]">{feedback(device)}</p></GlassCard>;
}

export default function Home() {
  const { devices, master, events } = useHomeMate();
  const find = (type: Device["type"]) => devices.find((device) => device.type === type) ?? { id: "slave_4", name: type, type, availability: "UNKNOWN", state: {} } as Device;
  const activity = events.slice(0, 4);
  const masterOnline = master.availability === "ONLINE";
  return <AppShell><PageContainer><header className="mb-10 flex items-end justify-between gap-6"><div><p className="mb-3 text-xs font-medium uppercase tracking-[.2em] text-[var(--accent)]">Your home</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Good morning</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">Here’s what’s happening around your home.</p></div></header>
    <GlassCard className="mb-6 flex flex-wrap items-center justify-between gap-4 px-5 py-4"><div className="flex items-center gap-3"><span className={`h-2 w-2 rounded-full ${masterOnline ? "bg-[var(--online)]" : "bg-[var(--unknown)]"}`} /><div><p className="text-sm font-medium">Home hub <span className={masterOnline ? "text-[var(--online)]" : "text-[var(--text-secondary)]"}>· {masterOnline ? "Connected" : master.availability === "OFFLINE" ? "Disconnected" : "Waiting for connection"}</span></p></div></div><div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)]"><span className="flex items-center gap-1.5"><i className={`h-1.5 w-1.5 rounded-full ${find("DOOR_SECURITY").availability === "ONLINE" ? "bg-[var(--online)]" : "bg-[var(--unknown)]"}`} />Door</span><span className="flex items-center gap-1.5"><i className={`h-1.5 w-1.5 rounded-full ${find("WATER_PUMP").availability === "ONLINE" ? "bg-[var(--online)]" : "bg-[var(--unknown)]"}`} />Pump</span><span className="flex items-center gap-1.5"><i className={`h-1.5 w-1.5 rounded-full ${find("FAN").availability === "ONLINE" ? "bg-[var(--online)]" : "bg-[var(--unknown)]"}`} />Fan</span></div></GlassCard>
    <section className="mb-10 grid gap-4 md:grid-cols-3"><DeviceSummary device={find("WATER_PUMP")} icon={Waves} /><DeviceSummary device={find("FAN")} icon={Radio} /><DeviceSummary device={find("DOOR_SECURITY")} icon={ShieldCheck} /></section>
    <section className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]"><GlassCard className="p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.15em] text-[var(--text-muted)]">Live feed</p><h2 className="mt-1 text-base font-semibold">Recent activity</h2></div><Link href="/activity" className="flex items-center gap-1 text-xs text-[var(--accent)]">View all <ArrowUpRight size={13} /></Link></div>{activity.length ? <div className="divide-y divide-[var(--glass-border)]">{activity.map((event) => <div key={event.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm text-[var(--text-primary)]">{event.message}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{event.type.replaceAll("_", " ").toLowerCase()}</p></div><time className="shrink-0 text-[11px] text-[var(--text-muted)]">{new Date(event.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></div>)}</div> : <p className="py-8 text-sm text-[var(--text-muted)]">No activity received yet.</p>}</GlassCard><GlassCard className="flex min-h-[210px] flex-col justify-between p-5 sm:p-6"><div><p className="text-xs uppercase tracking-[.15em] text-[var(--text-muted)]">Need a hand?</p><h2 className="mt-1 text-base font-semibold">Ask HomeMate</h2><p className="mt-2 max-w-xs text-sm leading-6 text-[var(--text-secondary)]">Control your devices or ask about their latest reported status.</p></div><Link href="/assistant" className="glass-hover mt-8 flex min-h-12 items-center gap-3 rounded-xl border border-[var(--glass-border)] px-3 text-sm text-[var(--text-secondary)]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]"><Mic size={15} /></span><span>Ask HomeMate…</span><ArrowUpRight className="ml-auto" size={15} /></Link></GlassCard></section>
  </PageContainer></AppShell>;
}
