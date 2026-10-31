"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bot, Home, Settings, SlidersHorizontal } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navigation = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/devices", label: "Devices", icon: SlidersHorizontal },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/assistant", label: "Assistant", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-[calc(100vh-2.5rem)] md:pl-[236px]">
      <aside className="fixed inset-y-0 left-0 top-10 h-[calc(100vh-2.5rem)] z-40 hidden w-[236px] flex-col border-r border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--background)_82%,transparent)] px-5 py-7 backdrop-blur-xl md:flex">
        <Link href="/" className="mb-12 flex items-center gap-3 px-2" aria-label="HomeMate overview">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-bold text-[var(--accent-foreground)]">H</span>
          <span className="text-[15px] font-semibold tracking-tight">HomeMate</span>
        </Link>
        <nav className="space-y-1" aria-label="Main navigation">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === href : pathname.startsWith(href);
            return <Link key={href} href={href} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition ${active ? "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] font-medium text-[var(--accent)]" : "text-[var(--text-secondary)] hover:bg-[var(--glass-fill)] hover:text-[var(--text-primary)]"}`}><Icon size={17} strokeWidth={active ? 2.2 : 1.8} />{label}</Link>;
          })}
        </nav>
        <div className="mt-auto flex justify-start px-2"><ThemeToggle /></div>
      </aside>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex min-h-[68px] items-center justify-around border-t border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
        {navigation.map(({ href, label, icon: Icon }) => { const active = href === "/" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} className={`flex min-w-12 flex-col items-center gap-1 py-2 text-[10px] ${active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}><Icon size={19} /><span>{label}</span></Link>; })}
      </nav>
      <div className="min-h-screen">{children}</div>
    </div>
  );
}
