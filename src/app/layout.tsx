import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitDrive — Your GitHub-powered Cloud Storage",
  description: "Use GitHub repositories as a Google Drive-style file store.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
