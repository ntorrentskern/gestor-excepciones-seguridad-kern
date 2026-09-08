import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ExcepcionesProvider } from "@/context/excepciones-context";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-app-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-app-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Gestor de Excepciones de Seguridad",
  description:
    "Oficina Técnica de Seguridad — inventario y seguimiento de excepciones corporativas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexMono.variable} h-full`}
    >
      <body className={`${plexSans.className} min-h-full`}>
        <ThemeProvider>
          <ExcepcionesProvider>
            <AppShell>{children}</AppShell>
          </ExcepcionesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
