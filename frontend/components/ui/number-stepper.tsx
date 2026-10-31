"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "./button";

export function NumberStepper({ value, onChange, min = 0, max = 999 }: { value: number; onChange: (value: number) => void; min?: number; max?: number }) {
  return (
    <div className="glass flex min-h-11 items-center justify-between gap-3 rounded-xl px-2">
      <Button aria-label="Decrease minutes" className="h-11 min-h-11 w-11 p-0 text-[var(--text-primary)]" onClick={() => onChange(Math.max(min, value - 1))}><Minus size={18} strokeWidth={2} /></Button>
      <span className="min-w-12 text-center text-sm font-semibold text-[var(--text-primary)]">{value}</span>
      <Button aria-label="Increase minutes" className="h-11 min-h-11 w-11 p-0 text-[var(--text-primary)]" onClick={() => onChange(Math.min(max, value + 1))}><Plus size={18} strokeWidth={2} /></Button>
    </div>
  );
}
