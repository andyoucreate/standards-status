import type { Metadata } from "next";
import type { ReactNode } from "react";
import { statusConfig } from "../../status.config";
import "./globals.css";

export const metadata: Metadata = {
  title: statusConfig.name,
  description: `Live status of ${statusConfig.name} services and incidents.`,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
        {children}
      </body>
    </html>
  );
}
