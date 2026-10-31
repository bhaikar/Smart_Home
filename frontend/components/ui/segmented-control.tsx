"use client";

export function SegmentedControl<T extends string>({ options, value, onChange, disabled = false }: { options: readonly T[]; value?: T; onChange: (value: T) => void; disabled?: boolean }) {
  return (
    <div className="glass flex min-h-11 w-full items-center gap-1 rounded-xl p-1" role="group">
      {options.map((option) => (
        <button key={option} type="button" onClick={() => onChange(option)} aria-pressed={value === option} disabled={disabled} className={`min-h-9 flex-1 rounded-lg px-2 text-xs font-medium transition ${value === option ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"} disabled:cursor-not-allowed disabled:opacity-50`}>
          {option[0].toUpperCase() + option.slice(1).toLowerCase()}
        </button>
      ))}
    </div>
  );
}
