import { Check, Circle, CircleX, Clock3 } from "lucide-react";
import type { CommandState } from "@/types";

export function CommandProgress({ state }: { state: CommandState }) {
  const failed = state === "FAILED";
  const timedOut = state === "TIMEOUT";
  const done = state === "EXECUTED";
  const received = ["ACKNOWLEDGED", "EXECUTED"].includes(state);
  const sent = ["PENDING", "SENT", "ACKNOWLEDGED", "EXECUTED"].includes(state);
  const steps = [{ label: "Sent", active: sent }, { label: "Received", active: received }, { label: "Done", active: done }];
  return <div className="mt-5 border-t border-[var(--glass-border)] pt-4"><div className="flex items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">{steps.map((step, index) => <div key={step.label} className="flex flex-1 items-center gap-2"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${step.active ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--accent)]" : "border-[var(--glass-border)]"}`}>{step.active ? <Check size={12} /> : <Circle size={9} />}</span><span className={step.active ? "text-[var(--text-primary)]" : ""}>{step.label}</span>{index < 2 && <span className={`h-px flex-1 ${steps[index + 1].active ? "bg-[var(--accent)]" : "bg-[var(--glass-border)]"}`} />}</div>)}</div>{failed && <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--failed)]"><CircleX size={13} /> Didn&apos;t work. Try again</p>}{timedOut && <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--working)]"><Clock3 size={13} /> Timed out while waiting for the device</p>}{done && <p className="mt-3 text-xs text-[var(--online)]">The device confirmed this change.</p>}</div>;
}
