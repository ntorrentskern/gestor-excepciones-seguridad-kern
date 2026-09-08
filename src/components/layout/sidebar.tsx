"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/",
    label: "Inicio",
    description: "Panel de control",
    icon: LayoutDashboard,
  },
  {
    href: "/excepciones",
    label: "Excepciones",
    description: "Inventario completo",
    icon: ListChecks,
  },
  {
    href: "/excepciones/nueva",
    label: "Nueva excepción",
    description: "Alta de registro",
    icon: PlusCircle,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-foreground">
            Gestor Excepciones
          </p>
          <p className="truncate text-xs text-muted-foreground">
            OTS · Seguridad
          </p>
        </div>
      </div>

      <div className="mx-4 h-px bg-border" />

      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Principal">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : item.href === "/excepciones/nueva"
                ? pathname === item.href
                : item.href === "/excepciones"
                  ? pathname === "/excepciones" ||
                    (pathname.startsWith("/excepciones/") &&
                      pathname !== "/excepciones/nueva")
                  : pathname === item.href;

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors",
                active
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  active
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
                aria-hidden
              />
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-sm",
                    active ? "font-semibold" : "font-medium"
                  )}
                >
                  {item.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <p className="text-xs text-muted-foreground">Fase 1 · Datos locales</p>
        <p className="mt-0.5 text-xs font-medium text-foreground/70">v1.0</p>
      </div>
    </div>
  );
}
