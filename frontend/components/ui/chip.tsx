import type { HTMLAttributes } from "react";

export function Chip({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={`inline-flex min-h-7 items-center rounded-lg border border-[var(--glass-border)] bg-[var(--glass-fill)] px-2.5 text-xs text-[var(--text-secondary)] ${className}`} {...props} />;
}
