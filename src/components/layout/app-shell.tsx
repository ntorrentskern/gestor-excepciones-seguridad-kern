"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import { Sidebar } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  CommandPalette,
  CommandPaletteTrigger,
} from "@/components/search/command-palette";
import { useSandbox } from "@/context/sandbox-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { enabled: sandboxEnabled } = useSandbox();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 h-screen shrink-0 self-start">
        <Sidebar />
      </aside>
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {sandboxEnabled ? (
          <div
            role="status"
            className="border-b border-amber-500/40 bg-amber-100 px-6 py-2 text-center text-sm font-medium text-amber-950 dark:bg-amber-950/60 dark:text-amber-100"
          >
            Entorno de demostración — datos aislados
          </div>
        ) : null}
        <header className="sticky top-0 z-10 border-b border-border bg-card/95 px-6 py-3 backdrop-blur-md">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                IT · Excepciones
              </p>
              <h1 className="mt-0.5 truncate text-lg font-semibold text-foreground">
                Gestor de Excepciones
              </h1>
            </div>

            <Image
              src="/logo-indukern.png"
              alt="Grupo Indukern"
              width={200}
              height={48}
              priority
              className="h-9 w-auto object-contain invert mix-blend-multiply dark:invert-0 dark:mix-blend-screen"
            />

            <div className="flex items-center justify-end gap-2">
              <CommandPaletteTrigger />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
