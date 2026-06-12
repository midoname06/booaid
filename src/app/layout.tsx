import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wafiq Agents",
  description: "AI Agent Builder no-code",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
