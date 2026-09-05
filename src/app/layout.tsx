import type { Metadata } from "next";
import { Afacad } from "next/font/google";
import type { ReactNode } from "react";
import { statusConfig } from "../../status.config";
import "./globals.css";

const afacad = Afacad({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-afacad" });

export const metadata: Metadata = {
  title: statusConfig.name,
  description: `Live status of ${statusConfig.name} services and incidents.`,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`antialiased ${afacad.variable}`}>
      <body className="min-h-screen bg-paper text-ink dark:bg-ink dark:text-paper">{children}</body>
    </html>
  );
}
