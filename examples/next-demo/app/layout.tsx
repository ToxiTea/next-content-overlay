import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "next-content-overlay demo",
  description: "Minimal App Router demo for init -> scan -> edit -> publish"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
