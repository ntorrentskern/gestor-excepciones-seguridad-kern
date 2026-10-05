"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Clock,
  FileSearch,
  Headphones,
  LayoutDashboard,
  PlusCircle,
  Search,
  Server,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { searchGlobalAction } from "@/lib/sujetos/actions";
import type { GlobalSearchResult } from "@/types/sujeto";
import { TIPO_SUJETO_LABELS } from "@/types/sujeto";
import { DOMINIO_LABELS, type Dominio } from "@/types/dominio";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

const RECENT_KEY = "ges_cmdk_recent";
const MAX_RECENT = 8;

type RecentItem = {
  label: string;
  href: string;
  kind: "search" | "action" | "sujeto" | "excepcion";
};

type ActionItem = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: typeof Search;
  keywords?: string;
};

type FlatItem =
  | { kind: "action"; action: ActionItem }
  | { kind: "recent"; recent: RecentItem }
  | {
      kind: "sujeto";
      id: string;
      label: string;
      hint: string;
      href: string;
    }
  | {
      kind: "excepcion";
      id: string;
      label: string;
      hint: string;
      href: string;
    };

function loadRecent(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentItem[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function pushRecent(item: RecentItem) {
  const prev = loadRecent().filter(
    (r) => !(r.href === item.href && r.label === item.label)
  );
  const next = [item, ...prev].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export function CommandPalette() {
  const router = useRouter();
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const actions = useMemo<ActionItem[]>(() => {
    const base: ActionItem[] = [
      {
        id: "nueva",
        label: "Nueva excepción",
        hint: "Alta",
        href: "/excepciones/nueva",
        icon: PlusCircle,
        keywords: "crear alta nueva",
      },
      {
        id: "buscar",
        label: "Abrir buscador avanzado",
        hint: "Correlación",
        href: "/buscar",
        icon: Search,
        keywords: "buscar pc usuario dispositivo",
      },
      {
        id: "dashboard",
        label: "Ver dashboard / gráficos",
        hint: "Inicio",
        href: "/",
        icon: BarChart3,
        keywords: "inicio panel graficos",
      },
      {
        id: "todas",
        label: "Inventario completo",
        href: "/excepciones",
        icon: LayoutDashboard,
        keywords: "todas listado",
      },
      {
        id: "seguridad",
        label: "Panel Seguridad",
        href: "/seguridad",
        icon: ShieldCheck,
      },
      {
        id: "sistemas",
        label: "Panel Sistemas",
        href: "/sistemas",
        icon: Server,
      },
      {
        id: "helpdesk",
        label: "Panel Helpdesk",
        href: "/helpdesk",
        icon: Headphones,
      },
    ];
    if (can("manage_users")) {
      base.push({
        id: "usuarios",
        label: "Administrar usuarios",
        href: "/admin/usuarios",
        icon: Users,
        keywords: "roles password admin",
      });
    }
    return base;
  }, [can]);

  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.keywords?.toLowerCase().includes(q) ||
        a.hint?.toLowerCase().includes(q)
    );
  }, [actions, query]);

  const flatItems = useMemo<FlatItem[]>(() => {
    const items: FlatItem[] = [];
    for (const action of filteredActions) {
      items.push({ kind: "action", action });
    }
    if (!query.trim()) {
      for (const r of recent) {
        items.push({ kind: "recent", recent: r });
      }
    }
    if (results) {
      for (const s of results.sujetos) {
        items.push({
          kind: "sujeto",
          id: s.id,
          label: s.display_name,
          hint: `${TIPO_SUJETO_LABELS[s.tipo]} · ${s.activas} activas`,
          href: `/sujetos/${s.id}`,
        });
      }
      for (const e of results.excepciones) {
        items.push({
          kind: "excepcion",
          id: e.id,
          label: e.id,
          hint: `${DOMINIO_LABELS[e.dominio as Dominio] ?? e.dominio} · ${e.estado} · ${e.activo_afectado}`,
          href: `/excepciones/${e.id}`,
        });
      }
    }
    return items;
  }, [filteredActions, query, recent, results]);

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("ges:open-cmdk", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("ges:open-cmdk", onOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults(null);
    setActiveIndex(0);
    setRecent(loadRecent());
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [flatItems.length, query]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const handle = window.setTimeout(() => {
      void searchGlobalAction(q)
        .then((data) => {
          if (!cancelled) setResults(data);
        })
        .catch(() => {
          if (!cancelled) setResults(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query]);

  const go = useCallback(
    (href: string, recentItem?: RecentItem) => {
      if (recentItem) pushRecent(recentItem);
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  function activate(item: FlatItem) {
    if (item.kind === "action") {
      go(item.action.href, {
        label: item.action.label,
        href: item.action.href,
        kind: "action",
      });
      return;
    }
    if (item.kind === "recent") {
      go(item.recent.href, item.recent);
      return;
    }
    go(item.href, {
      label: item.label,
      href: item.href,
      kind: item.kind,
    });
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(flatItems.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatItems[activeIndex];
      if (item) activate(item);
      else if (query.trim().length >= 2) {
        go(`/buscar?q=${encodeURIComponent(query.trim())}`, {
          label: `Buscar: ${query.trim()}`,
          href: `/buscar?q=${encodeURIComponent(query.trim())}`,
          kind: "search",
        });
      }
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Búsqueda rápida"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Buscar PC, usuario, excepción… o elige una acción"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-controls={listId}
            aria-autocomplete="list"
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>

        <div
          id={listId}
          className="max-h-[50vh] overflow-y-auto p-2"
          role="listbox"
        >
          {loading ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Buscando…</p>
          ) : null}

          {!loading && flatItems.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Sin resultados. Enter abre el buscador avanzado.
            </p>
          ) : null}

          {flatItems.map((item, index) => {
            const active = index === activeIndex;
            if (item.kind === "action") {
              const Icon = item.action.icon;
              return (
                <button
                  key={`a-${item.action.id}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm",
                    active ? "bg-primary/10 text-foreground" : "hover:bg-muted"
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => activate(item)}
                >
                  <Icon className="size-4 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {item.action.label}
                  </span>
                  {item.action.hint ? (
                    <span className="text-xs text-muted-foreground">
                      {item.action.hint}
                    </span>
                  ) : null}
                </button>
              );
            }

            if (item.kind === "recent") {
              return (
                <button
                  key={`r-${item.recent.href}-${item.recent.label}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm",
                    active ? "bg-primary/10" : "hover:bg-muted"
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => activate(item)}
                >
                  <Clock className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{item.recent.label}</span>
                </button>
              );
            }

            const Icon = item.kind === "sujeto" ? User : FileSearch;
            return (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                role="option"
                aria-selected={active}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm",
                  active ? "bg-primary/10" : "hover:bg-muted"
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => activate(item)}
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{item.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ navegar · Enter abrir · Ctrl+K cerrar</span>
          <button
            type="button"
            className="hover:text-foreground"
            onClick={() =>
              go(
                query.trim()
                  ? `/buscar?q=${encodeURIComponent(query.trim())}`
                  : "/buscar"
              )
            }
          >
            Buscador avanzado →
          </button>
        </div>
      </div>
    </div>
  );
}

export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("ges:open-cmdk"))}
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Search className="size-3.5" aria-hidden />
      <span className="hidden sm:inline">Buscar</span>
      <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">
        Ctrl+K
      </kbd>
    </button>
  );
}
