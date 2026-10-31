import { CircleCheck, CircleX, Clock3, HelpCircle, MinusCircle, Wifi, type LucideIcon } from "lucide-react";

export const statusVariants = ["online", "offline", "unknown", "working", "done", "failed", "not-configured"] as const;
export type StatusVariant = (typeof statusVariants)[number];

const config: Record<StatusVariant, { label: string; icon: LucideIcon; color: string }> = {
  online: { label: "Online", icon: Wifi, color: "var(--online)" },
  offline: { label: "Offline", icon: Wifi, color: "var(--unknown)" },
  unknown: { label: "Unknown", icon: HelpCircle, color: "var(--unknown)" },
  working: { label: "Working", icon: Clock3, color: "var(--working)" },
  done: { label: "Done", icon: CircleCheck, color: "var(--online)" },
  failed: { label: "Failed", icon: CircleX, color: "var(--failed)" },
  "not-configured": { label: "Not configured", icon: MinusCircle, color: "var(--unknown)" },
};

export function StatusPill({ variant }: { variant: StatusVariant }) {
  const item = config[variant];
  const Icon = item.icon;
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-fill)] px-2.5 text-xs font-medium" style={{ color: item.color }}>
      <Icon size={13} strokeWidth={2} aria-hidden="true" />
      {item.label}
    </span>
  );
}
