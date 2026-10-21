"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AppWindow,
  ArrowRight,
  Monitor,
  Search,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { EstadoBadge } from "@/components/excepciones/estado-badge";
import {
  listCmdbCatalogAction,
  searchGlobalAction,
} from "@/lib/sujetos/actions";
import type { GlobalSearchResult, SujetoConStats, TipoSujeto } from "@/types/sujeto";
import { TIPO_SUJETO_LABELS } from "@/types/sujeto";
import { DOMINIO_LABELS, type Dominio } from "@/types/dominio";
import type { EstadoExcepcion } from "@/types/excepcion";
import { cn } from "@/lib/utils";
import { useSandbox } from "@/context/sandbox-context";

type CatalogTab = "usuario" | "activo" | "servicio";

const CATALOG_TABS: Array<{
  id: CatalogTab;
  label: string;
  icon: typeof User;
}> = [
  { id: "usuario", label: "Personas", icon: User },
  { id: "activo", label: "Activos", icon: Monitor },
  { id: "servicio", label: "Servicios", icon: AppWindow },
];

function iconForTipo(tipo: string) {
  if (tipo === "usuario") return User;
  if (tipo === "activo") return Monitor;
  if (tipo === "servicio") return AppWindow;
  return Search;
}

function SujetoCard({ s }: { s: SujetoConStats }) {
  const Icon = iconForTipo(s.tipo);
  return (
    <Link
      href={`/sujetos/${s.id}`}
      className="group rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {s.display_name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {TIPO_SUJETO_LABELS[s.tipo]} · {s.clave}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            <span className="rounded-md bg-muted px-1.5 py-0.5">
              {s.total_excepciones} exc.
            </span>
            <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-emerald-800 dark:text-emerald-300">
              {s.activas} activas
            </span>
            {s.pendientes > 0 ? (
              <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-amber-800 dark:text-amber-300">
                {s.pendientes} pend.
              </span>
            ) : null}
          </div>
        </div>
        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
      </div>
    </Link>
  );
}

export function BuscadorAvanzado() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { enabled: sandboxEnabled } = useSandbox();
  const initial = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const [submitted, setSubmitted] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GlobalSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [catalogTab, setCatalogTab] = useState<CatalogTab>("usuario");
  const [catalog, setCatalog] = useState<SujetoConStats[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    setQuery(initial);
    setSubmitted(initial);
  }, [initial]);

  useEffect(() => {
    const q = submitted.trim();
    if (q.length < 2) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void searchGlobalAction(q)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error de búsqueda");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [submitted]);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    void listCmdbCatalogAction(catalogTab as TipoSujeto)
      .then((rows) => {
        if (!cancelled) setCatalog(rows);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [catalogTab, sandboxEnabled]);

  const resumen = useMemo(() => {
    if (!data) return null;
    const personas = data.sujetos.filter((s) => s.tipo === "usuario").length;
    const activos = data.sujetos.filter((s) => s.tipo === "activo").length;
    const servicios = data.sujetos.filter((s) => s.tipo === "servicio").length;
    const activas = data.sujetos.reduce((acc, s) => acc + s.activas, 0);
    return {
      personas,
      activos,
      servicios,
      excepciones: data.excepciones.length,
      activas,
    };
  }, [data]);

  const searchByTipo = useMemo(() => {
    if (!data) return { usuario: [], activo: [], servicio: [], otro: [] };
    return {
      usuario: data.sujetos.filter((s) => s.tipo === "usuario"),
      activo: data.sujetos.filter((s) => s.tipo === "activo"),
      servicio: data.sujetos.filter((s) => s.tipo === "servicio"),
      otro: data.sujetos.filter((s) => s.tipo === "otro"),
    };
  }, [data]);

  function runSearch(next: string) {
    const q = next.trim();
    setSubmitted(q);
    router.replace(q ? `/buscar?q=${encodeURIComponent(q)}` : "/buscar");
  }

  const searching = submitted.trim().length >= 2;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Buscador / CMDB
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Personas, activos y servicios vinculados a excepciones.
        </p>
      </div>

      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch(query);
              }}
              placeholder="Usuario, equipo o servicio…"
              className="pl-9"
            />
          </div>
          <Button type="button" onClick={() => runSearch(query)}>
            Buscar
          </Button>
          {searching ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQuery("");
                runSearch("");
              }}
            >
              Limpiar
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Buscando…</p>
      ) : null}

      {!loading && searching && data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-5">
            <SummaryTile label="Personas" value={resumen?.personas ?? 0} />
            <SummaryTile label="Activos" value={resumen?.activos ?? 0} />
            <SummaryTile label="Servicios" value={resumen?.servicios ?? 0} />
            <SummaryTile
              label="Excepciones"
              value={resumen?.excepciones ?? 0}
            />
            <SummaryTile label="Activas" value={resumen?.activas ?? 0} />
          </div>

          {(
            [
              ["usuario", "Personas", searchByTipo.usuario],
              ["activo", "Activos", searchByTipo.activo],
              ["servicio", "Servicios", searchByTipo.servicio],
              ["otro", "Otros", searchByTipo.otro],
            ] as const
          ).map(([key, label, items]) =>
            items.length > 0 ? (
              <section key={key} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </h3>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((s) => (
                    <SujetoCard key={s.id} s={s} />
                  ))}
                </div>
              </section>
            ) : null
          )}

          {data.sujetos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ninguna persona, activo o servicio coincide.
            </p>
          ) : null}

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Excepciones que coinciden
            </h3>
            {data.excepciones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay excepciones con ese texto.
              </p>
            ) : (
              <div className="space-y-2">
                {data.excepciones.map((e) => (
                  <Link
                    key={e.id}
                    href={`/excepciones/${e.id}`}
                    className="flex flex-col gap-2 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-primary/5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-medium">
                          {e.id}
                        </span>
                        <EstadoBadge estado={e.estado as EstadoExcepcion} />
                        <span className="text-xs text-muted-foreground">
                          {DOMINIO_LABELS[e.dominio as Dominio] ?? e.dominio}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {e.tipo_excepcion} · {e.activo_afectado}
                      </p>
                    </div>
                    <span className="truncate text-xs text-muted-foreground sm:max-w-[220px] sm:text-right">
                      {e.solicitante_email}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}

      {!searching ? (
        <section className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Inventario CMDB
              </h3>
            </div>
            <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/40 p-1">
              {CATALOG_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = catalogTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCatalogTab(tab.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {catalogLoading ? (
            <p className="text-sm text-muted-foreground">Cargando catálogo…</p>
          ) : catalog.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin registros.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {catalog.map((s) => (
                <SujetoCard key={s.id} s={s} />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function SummaryTile({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
