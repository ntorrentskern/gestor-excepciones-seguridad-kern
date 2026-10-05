"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Monitor,
  Search,
  ShieldAlert,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EstadoBadge } from "@/components/excepciones/estado-badge";
import { searchGlobalAction } from "@/lib/sujetos/actions";
import type { GlobalSearchResult } from "@/types/sujeto";
import { TIPO_SUJETO_LABELS } from "@/types/sujeto";
import { DOMINIO_LABELS, type Dominio } from "@/types/dominio";
import type { EstadoExcepcion } from "@/types/excepcion";

function iconForTipo(tipo: string) {
  if (tipo === "usuario") return User;
  if (tipo === "activo") return Monitor;
  return Search;
}

export function BuscadorAvanzado() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const [submitted, setSubmitted] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GlobalSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const resumen = useMemo(() => {
    if (!data) return null;
    const activas = data.sujetos.reduce((acc, s) => acc + s.activas, 0);
    const pendientes = data.sujetos.reduce((acc, s) => acc + s.pendientes, 0);
    return {
      sujetos: data.sujetos.length,
      excepciones: data.excepciones.length,
      activas,
      pendientes,
    };
  }, [data]);

  function runSearch(next: string) {
    const q = next.trim();
    setSubmitted(q);
    router.replace(q ? `/buscar?q=${encodeURIComponent(q)}` : "/buscar");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Buscador de correlación
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Encuentra un usuario, PC o dispositivo y verás todo lo vinculado: qué
          excepciones tiene, en qué dominio y cómo se relaciona con otros
          activos. También puedes usar{" "}
          <kbd className="rounded border border-border px-1 text-[11px]">
            Ctrl+K
          </kbd>
          .
        </p>
      </div>

      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch(query);
              }}
              placeholder="Ej. j.garcia, PC-FIN-12, srv-file01…"
              className="pl-9"
            />
          </div>
          <Button type="button" onClick={() => runSearch(query)}>
            Buscar
          </Button>
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

      {!loading && submitted.trim().length >= 2 && data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <SummaryTile label="Usuarios / activos" value={resumen?.sujetos ?? 0} />
            <SummaryTile
              label="Excepciones"
              value={resumen?.excepciones ?? 0}
            />
            <SummaryTile label="Activas vinculadas" value={resumen?.activas ?? 0} />
            <SummaryTile
              label="Pendientes"
              value={resumen?.pendientes ?? 0}
              warn
            />
          </div>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Personas y activos
            </h3>
            {data.sujetos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ningún usuario o activo coincide. Prueba con el hostname, email
                o parte del nombre.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {data.sujetos.map((s) => {
                  const Icon = iconForTipo(s.tipo);
                  return (
                    <Link
                      key={s.id}
                      href={`/sujetos/${s.id}`}
                      className="group rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-foreground">
                            {s.display_name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {TIPO_SUJETO_LABELS[s.tipo]} · {s.clave}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-md bg-muted px-2 py-0.5">
                              {s.total_excepciones} excepciones
                            </span>
                            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-800 dark:text-emerald-300">
                              {s.activas} activas
                            </span>
                            {s.pendientes > 0 ? (
                              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-amber-800 dark:text-amber-300">
                                {s.pendientes} pendientes
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Excepciones que coinciden
            </h3>
            {data.excepciones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay excepciones con ese texto en ID, usuario o equipo.
              </p>
            ) : (
              <div className="space-y-2">
                {data.excepciones.map((e) => (
                  <Link
                    key={e.id}
                    href={`/excepciones/${e.id}`}
                    className="flex flex-col gap-2 rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold">
                          {e.id}
                        </span>
                        <EstadoBadge estado={e.estado as EstadoExcepcion} />
                        <span className="text-xs text-muted-foreground">
                          {DOMINIO_LABELS[e.dominio as Dominio] ?? e.dominio}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
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

      {!loading && submitted.trim().length < 2 ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="size-4 text-primary" />
              Cómo usarlo en una baja o cambio de PC
            </CardTitle>
            <CardDescription>
              1) Busca el usuario o el hostname. 2) Abre la ficha. 3) Revisa
              excepciones activas de red, seguridad, endpoint, etc. 4) Cancela o
              edita desde ahí.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          warn && value > 0 ? "text-amber-700 dark:text-amber-400" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
