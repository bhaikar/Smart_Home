export function DemoModeBanner() {
  return (
    <div className="sticky top-0 z-50 h-10 border-b border-[color-mix(in_srgb,var(--working)_35%,transparent)] bg-[color-mix(in_srgb,var(--working)_12%,var(--background))] px-4 py-2 text-center text-xs font-medium text-[var(--working)]">
      Demo mode, not connected to real devices
    </div>
  );
}
