import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Artificial Voices",
  description: "Point your camera at anything to learn its name in 10 languages",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}
