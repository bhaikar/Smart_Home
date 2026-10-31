import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger-soft" | "disabled";

const styles: Record<ButtonVariant, string> = {
  primary: "bg-[var(--accent)] text-[var(--accent-foreground)] hover:brightness-110",
  secondary: "glass text-[var(--text-primary)] hover:bg-[var(--glass-fill-strong)]",
  "danger-soft": "border border-[color-mix(in_srgb,var(--failed)_35%,transparent)] bg-[color-mix(in_srgb,var(--failed)_14%,transparent)] text-[var(--failed)] hover:bg-[color-mix(in_srgb,var(--failed)_22%,transparent)]",
  disabled: "cursor-not-allowed border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-muted)] opacity-60",
};

export function Button({ variant = "secondary", className = "", disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button disabled={disabled || variant === "disabled"} className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-medium transition ${styles[variant]} ${className}`} {...props} />;
}
