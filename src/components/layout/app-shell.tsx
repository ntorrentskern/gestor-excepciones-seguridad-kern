import { Sidebar } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 h-screen shrink-0 self-start">
        <Sidebar />
      </aside>
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-card/95 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                Oficina Técnica de Seguridad
              </p>
              <h1 className="mt-0.5 text-lg font-semibold text-foreground">
                Gestor de Excepciones de Seguridad
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground sm:block">
                Sesión local · sin autenticación
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
