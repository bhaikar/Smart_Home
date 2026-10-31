"use client";

import { useState } from "react";
import { Check, MessageCircle, Sun } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { GlassCard } from "@/components/ui/glass-card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useTheme } from "next-themes";

function SettingToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl px-1 py-2">
      <span><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-xs text-[var(--text-secondary)]">{description}</span></span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full border transition ${checked ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--glass-border-strong)] bg-[var(--glass-fill)]"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${checked ? "left-6" : "left-1"}`} /></button>
    </label>
  );
}

export default function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [speakReplies, setSpeakReplies] = useState(false);
  const [activityNotifications, setActivityNotifications] = useState(true);
  const theme = resolvedTheme === "light" ? "light" : "dark";
  return <AppShell><PageContainer><header className="mb-9"><p className="mb-3 text-xs font-medium uppercase tracking-[.2em] text-[var(--accent)]">Preferences</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Settings</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">Make HomeMate feel right for you.</p></header><div className="space-y-5"><GlassCard className="p-5 sm:p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--glass-fill-strong)] text-[var(--accent)]"><Sun size={17} /></span><div><h2 className="font-semibold">Appearance</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">Choose how HomeMate looks.</p></div></div><SegmentedControl options={["light", "dark"] as const} value={theme} onChange={setTheme} /></GlassCard><GlassCard className="p-5 sm:p-6"><div className="mb-4 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--glass-fill-strong)] text-[var(--accent)]"><MessageCircle size={17} /></span><div><h2 className="font-semibold">Dashboard</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">Control helpful feedback on this device.</p></div></div><div className="divide-y divide-[var(--glass-border)]"><SettingToggle label="Speak assistant replies" description="Read responses aloud when you ask HomeMate something." checked={speakReplies} onChange={setSpeakReplies} /><SettingToggle label="Show activity notifications" description="Keep new activity updates visible while you work." checked={activityNotifications} onChange={setActivityNotifications} /></div></GlassCard></div><p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-[var(--text-muted)]"><Check size={13} />HomeMate keeps data in memory only. It clears when the app restarts.</p></PageContainer></AppShell>;
}
