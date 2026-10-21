"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ClipboardList,
  FlaskConical,
  Globe,
  Headphones,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Network,
  PlusCircle,
  ScrollText,
  Search,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/lib/auth/actions";
import { useAuth } from "@/context/auth-context";
import { useSandbox } from "@/context/sandbox-context";

type NavLeaf = {
  href: string;
  label: string;
  description?: string;
  icon: typeof LayoutDashboard;
};

type NavGroup = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  children: NavLeaf[];
};

const topItems: NavLeaf[] = [
  {
    href: "/",
    label: "Inicio",
    description: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/buscar",
    label: "Buscador / CMDB",
    description: "Personas · activos · servicios",
    icon: Search,
  },
  {
    href: "/operaciones",
    label: "Operaciones",
    description: "Bajas y cambios PC",
    icon: ClipboardList,
  },
];

const excepcionesGroup: NavGroup = {
  id: "excepciones",
  label: "Excepciones",
  icon: ListChecks,
  children: [
    {
      href: "/excepciones",
      label: "Todas",
      description: "Inventario completo",
      icon: ListChecks,
    },
    {
      href: "/seguridad",
      label: "Seguridad",
      description: "Ciberseguridad",
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
  ],
};

const iocGroup: NavGroup = {
  id: "ioc",
  label: "IOC",
  icon: ShieldAlert,
  children: [
    {
      href: "/ioc/dominios",
      label: "Dominios",
      description: "Indicadores",
      icon: Globe,
    },
    {
      href: "/ioc/ips",
      label: "IPs",
      description: "Indicadores",
      icon: Network,
    },
  ],
};

function pathInGroup(pathname: string, group: NavGroup): boolean {
  return group.children.some((c) => isActive(pathname, c.href));
}

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
  if (href === "/auditoria") {
    return pathname === "/auditoria" || pathname.startsWith("/auditoria/");
  }
  if (href === "/ioc/dominios" || href === "/ioc/ips") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href === "/ajustes") {
    return (
      pathname === "/ajustes" ||
      pathname.startsWith("/ajustes/") ||
      pathname.startsWith("/admin/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  active,
  compact,
}: {
  item: NavLeaf;
  active: boolean;
  compact?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-start gap-3 rounded-xl px-3 transition-colors",
        compact ? "py-2" : "py-2.5",
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
        {item.description ? (
          <span className="block text-xs text-muted-foreground">
            {item.description}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function CollapsibleGroup({
  group,
  pathname,
  defaultOpen,
}: {
  group: NavGroup;
  pathname: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const GroupIcon = group.icon;
  const anyActive = pathInGroup(pathname, group);

  useEffect(() => {
    if (anyActive) setOpen(true);
  }, [anyActive, pathname]);

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
          anyActive
            ? "text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        aria-expanded={open}
      >
        <GroupIcon
          className={cn(
            "size-4 shrink-0",
            anyActive ? "text-primary" : "text-muted-foreground"
          )}
          aria-hidden
        />
        <span
          className={cn(
            "min-w-0 flex-1 text-sm",
            anyActive ? "font-semibold" : "font-medium"
          )}
        >
          {group.label}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="ml-2 space-y-0.5 border-l border-border pl-2">
          {group.children.map((child) => (
            <NavLink
              key={child.href}
              item={child}
              active={isActive(pathname, child.href)}
              compact
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { allowed: sandboxAllowed, enabled: sandboxEnabled, toggle } =
    useSandbox();

  return (
    <div className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ShieldCheck className="size-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-foreground">
            Gestor Excepciones
          </p>
          <p className="truncate text-xs text-muted-foreground">
            IT · Seguridad · Sistemas · Helpdesk
          </p>
          {sandboxEnabled ? (
            <span className="mt-1 inline-flex rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              Demo
            </span>
          ) : null}
        </div>
      </div>

      <div className="mx-4 h-px bg-border" />

      <nav
        className="flex flex-1 flex-col gap-1 overflow-y-auto p-3"
        aria-label="Principal"
      >
        {topItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
          />
        ))}

        <CollapsibleGroup
          group={excepcionesGroup}
          pathname={pathname}
          defaultOpen={pathInGroup(pathname, excepcionesGroup)}
        />

        <CollapsibleGroup
          group={iocGroup}
          pathname={pathname}
          defaultOpen={
            pathInGroup(pathname, iocGroup) || pathname.startsWith("/ioc")
          }
        />

        <NavLink
          item={{
            href: "/auditoria",
            label: "Logs auditoría",
            description: "Historial global",
            icon: ScrollText,
          }}
          active={isActive(pathname, "/auditoria")}
        />
      </nav>

      <div className="space-y-2 border-t border-border p-3">
        {user ? (
          <div className="flex items-center gap-1.5 px-1">
            <div className="min-w-0 flex-1 px-2">
              <p className="truncate text-sm font-medium text-foreground">
                {user.nombre} {user.apellidos}
              </p>
              <p className="truncate text-xs text-muted-foreground capitalize">
                {user.rol}
              </p>
            </div>
            <Link
              href="/ajustes"
              title="Ajustes"
              aria-label="Ajustes"
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                isActive(pathname, "/ajustes")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Settings className="size-4" aria-hidden />
            </Link>
            {sandboxAllowed ? (
              <button
                type="button"
                title={sandboxEnabled ? "Desactivar demo" : "Activar demo"}
                aria-label={sandboxEnabled ? "Desactivar demo" : "Activar demo"}
                aria-pressed={sandboxEnabled}
                onClick={toggle}
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                  sandboxEnabled
                    ? "bg-amber-500/20 text-amber-800 dark:text-amber-200"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <FlaskConical className="size-4" aria-hidden />
              </button>
            ) : null}
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

        <Link
          href="/excepciones/nueva"
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
            isActive(pathname, "/excepciones/nueva")
              ? "bg-primary text-primary-foreground"
              : "bg-primary/90 text-primary-foreground hover:bg-primary"
          )}
        >
          <PlusCircle className="size-4 shrink-0" aria-hidden />
          Nueva excepción
        </Link>

        <p className="px-2 text-center text-[11px] text-muted-foreground">
          v1.4 · Fase 3
        </p>
      </div>
    </div>
  );
}
