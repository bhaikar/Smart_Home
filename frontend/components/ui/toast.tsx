"use client";

import { Toaster, toast as sonnerToast } from "sonner";

export function ToastProvider() {
  return <Toaster position="bottom-right" theme="dark" toastOptions={{ className: "glass !text-[var(--text-primary)] !border-[var(--glass-border)]", style: { background: "var(--glass-fill-strong)" } }} />;
}

export const toast = {
  success: (message: string, description?: string) => sonnerToast.success(message, { description }),
  error: (message: string, description?: string) => sonnerToast.error(message, { description }),
};
