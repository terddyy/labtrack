import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LABTRACK Admin",
  description: "Hardware asset management dashboard for CCS asset administrators."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
