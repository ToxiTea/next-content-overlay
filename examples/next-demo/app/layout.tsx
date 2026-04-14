import type { Metadata } from "next";
import { ContentOverlayProvider, EditModeToggle } from "next-content-overlay";
import { getContent } from "next-content-overlay/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "next-content-overlay demo",
  description: "Plug-and-play inline CMS for Next.js — no database."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const content = await getContent();
  return (
    <html lang="en">
      <body>
        <ContentOverlayProvider initialContent={content}>
          {children}
          <EditModeToggle />
        </ContentOverlayProvider>
      </body>
    </html>
  );
}
