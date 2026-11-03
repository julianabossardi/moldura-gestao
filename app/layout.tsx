import type { Metadata, Viewport } from "next";
import "./moldura.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "moldura · gestão",
  description: "o trabalho da moldura, visível para cada uma de nós",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
