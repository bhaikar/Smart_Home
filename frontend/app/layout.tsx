import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { HomeMateProvider } from "@/hooks/useHomeMate";
import { DemoModeBanner } from "@/components/ui/demo-mode-banner";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HomeMate Design System",
  description: "HomeMate smart home interface",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <HomeMateProvider>
            {process.env.NEXT_PUBLIC_MOCK_MODE === "true" && <DemoModeBanner />}
            {children}
          </HomeMateProvider>
          <ToastProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
