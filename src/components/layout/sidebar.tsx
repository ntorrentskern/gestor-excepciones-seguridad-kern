"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Headphones,
  LayoutDashboard,
  ListChecks,
  LogOut,
  PlusCircle,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/lib/auth/actions";
import { useAuth } from "@/context/auth-context";

const navItems = [
  {
    href: "/",
    label: "Inicio",
    description: "Dashboard global",
    icon: LayoutDashboard,
  },
  {
    href: "/buscar",
    label: "Buscador",
    description: "PC, usuario, correlación",
    icon: Search,
  },
  {
    href: "/operaciones",
    label: "Operaciones",
    description: "Bajas y cambios PC",
    icon: ClipboardList,
  },
  {
    href: "/seguridad",
    label: "Seguridad",
    description: "Excepciones ciber",
    icon: ShieldCheck,
  },
  {
    href: "/sistemas",
    label: "Sistemas",
    description: "Infra, FW, cloud",
    icon: Server,
  },
  {
    href: "/helpdesk",
    label: "Helpdesk",
    description: "Endpoint y soporte",
    icon: Headphones,
  },
  {
    href: "/excepciones",
    label: "Todas",
    description: "Inventario completo",
    icon: ListChecks,
  },
  {
    href: "/excepciones/nueva",
    label: "Nueva excepción",
    description: "Alta de registro",
    icon: PlusCircle,
  },
  {
    href: "/ajustes",
    label: "Ajustes",
    description: "Perfil de usuario",
    icon: Settings,
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/excepciones/nueva") return pathname === href;
  if (href === "/excepciones") {
    return (
      pathname === "/excepciones" ||
      (pathname.startsWith("/excepciones/") &&
        pathname !== "/excepciones/nueva")
    );
  }
  if (href === "/operaciones") {
    return pathname === "/operaciones" || pathname.startsWith("/operaciones/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, can } = useAuth();
  const showAdmin = can("manage_users");

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
            IT · Seguridad · Sistemas · Helpdesk
          </p>
        </div>
      </div>

      <div className="mx-4 h-px bg-border" />

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Principal">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
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

        {showAdmin ? (
          <Link
            href="/admin/usuarios"
            className={cn(
              "group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors",
              isActive(pathname, "/admin/usuarios")
                ? "bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Users
              className={cn(
                "mt-0.5 size-4 shrink-0",
                isActive(pathname, "/admin/usuarios")
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-foreground"
              )}
              aria-hidden
            />
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-sm",
                  isActive(pathname, "/admin/usuarios")
                    ? "font-semibold"
                    : "font-medium"
                )}
              >
                Usuarios
              </span>
              <span className="block text-xs text-muted-foreground">
                Roles y acceso
              </span>
            </span>
          </Link>
        ) : null}
      </nav>

      <div className="space-y-3 border-t border-border p-4">
        {user ? (
          <div className="px-3">
            <p className="truncate text-sm font-medium text-foreground">
              {user.nombre} {user.apellidos}
            </p>
            <p className="truncate text-xs text-muted-foreground capitalize">
              {user.rol}
            </p>
          </div>
        ) : null}
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" aria-hidden />
            Cerrar sesión
          </button>
        </form>
        <p className="px-3 text-xs font-medium text-foreground/70">v1.3 · Fase 3</p>
      </div>
    </div>
  );
}
