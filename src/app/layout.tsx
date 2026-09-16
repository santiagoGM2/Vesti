import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Vesti · Tu armario, nuevas posibilidades",
  description: "Un pequeño universo de estilo, hecho para ti.",
  applicationName: "Vesti",
  appleWebApp: { capable: true, title: "Vesti", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: "#ffffff" };
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
