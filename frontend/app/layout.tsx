import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JagoRoute — IoT API Router",
  description: "Collect, group and route IoT hardware APIs into unified endpoints.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}