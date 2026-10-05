"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Link2,
  Monitor,
  PlusCircle,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EstadoBadge } from "@/components/excepciones/estado-badge";
import { getSujetoFichaAction } from "@/lib/sujetos/actions";
import { formatearFecha } from "@/lib/excepciones/utils";
import {
  DOMINIO_LABELS,
  DOMINIOS,
  type Dominio,
} from "@/types/dominio";
import type { EstadoExcepcion } from "@/types/excepcion";
import {
  TIPO_SUJETO_LABELS,
  VINCULADO_LABEL,
  type Sujeto,
  type SujetoConStats,
} from "@/types/sujeto";
import type { ExcepcionResumenSujeto } from "@/lib/sujetos/repository";
import { buildNuevaExcepcionRelacionadaHref } from "@/lib/sujetos/vinculo-helpers";
import { EventoOperativoPanel } from "@/components/operaciones/evento-operativo-panel";
import { listEventosOperativosAction } from "@/lib/operaciones/actions";
import {
  TIPO_EVENTO_OPERATIVO_LABELS,
  type EventoOperativo,
} from "@/types/operaciones";
import { formatearFechaHora } from "@/lib/excepciones/utils";

function iconForTipo(tipo: string) {
  if (tipo === "usuario") return User;
  return Monitor;
}

export function SujetoFicha({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sujeto, setSujeto] = useState<Sujeto | null>(null);
  const [excepciones, setExcepciones] = useState<ExcepcionResumenSujeto[]>([]);
  const [relacionados, setRelacionados] = useState<SujetoConStats[]>([]);
  const [eventos, setEventos] = useState<EventoOperativo[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getSujetoFichaAction(id)
      .then(async (data) => {
        if (cancelled) return;
        if (!data) {
          setSujeto(null);
          setExcepciones([]);
          setRelacionados([]);
          setEventos([]);
          return;
        }
        setSujeto(data.sujeto);
        setExcepciones(data.excepciones);
        setRelacionados(data.relacionados);
        const ops = await listEventosOperativosAction(id);
        if (!cancelled) setEventos(ops);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const porDominio = useMemo(() => {
    const map = new Map<Dominio, ExcepcionResumenSujeto[]>();
    for (const d of DOMINIOS) map.set(d, []);
    for (const e of excepciones) {
      const list = map.get(e.dominio) ?? [];
      list.push(e);
      map.set(e.dominio, list);
    }
    return DOMINIOS.map((d) => ({
      dominio: d,
      items: map.get(d) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [excepciones]);

  const activas = excepciones.filter(
    (e) => e.estado === "Pendiente" || e.estado === "Aprobada"
  );
  const pendientes = excepciones.filter((e) => e.estado === "Pendiente");

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando ficha…</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-rose-700" role="alert">
        {error}
      </p>
    );
  }

  if (!sujeto) {
    return (
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>{VINCULADO_LABEL} no encontrado</CardTitle>
          <CardDescription>No existe el registro {id}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/buscar">
              <ArrowLeft className="size-4" />
              Volver al buscador
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const Icon = iconForTipo(sujeto.tipo);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/buscar">
              <ArrowLeft className="size-4" />
              Buscador
            </Link>
          </Button>
          <div className="flex items-start gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="size-7" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {TIPO_SUJETO_LABELS[sujeto.tipo]}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">
                {sujeto.display_name}
              </h2>
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                {sujeto.clave}
              </p>
            </div>
          </div>
        </div>
        <Button asChild>
          <Link href={buildNuevaExcepcionRelacionadaHref(sujeto)}>
            <PlusCircle className="size-4" />
            Nueva excepción relacionada
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Excepciones" value={excepciones.length} />
        <Stat label="Activas" value={activas.length} accent="emerald" />
        <Stat label="Pendientes" value={pendientes.length} accent="amber" />
      </div>

      {activas.length > 0 ? (
        <Card className="shadow-none border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Checklist operativo</CardTitle>
            <CardDescription>
              Excepciones activas a revisar en una baja o cambio de dispositivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {activas.map((e) => (
              <Link
                key={e.id}
                href={`/excepciones/${e.id}`}
                className="flex flex-col gap-1 rounded-xl border border-border bg-card px-3 py-2 hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-medium">{e.id}</span>
                    <EstadoBadge estado={e.estado} />
                    <span className="text-xs text-muted-foreground">
                      {DOMINIO_LABELS[e.dominio]}
                    </span>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {e.tipo_excepcion}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  Rev. {formatearFecha(e.fecha_revision)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : (
        <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          No hay excepciones activas vinculadas.
        </p>
      )}

      <EventoOperativoPanel
        sujetoId={sujeto.id}
        tipoPreferido={
          sujeto.tipo === "usuario" ? "BajaUsuario" : "CambioDispositivo"
        }
      />

      {eventos.length > 0 ? (
        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base">Eventos recientes</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/operaciones">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {eventos.map((ev) => (
              <Link
                key={ev.id}
                href={`/operaciones/${ev.id}`}
                className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm hover:border-primary/40"
              >
                <span>
                  {TIPO_EVENTO_OPERATIVO_LABELS[ev.tipo]} · {ev.estado}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatearFechaHora(ev.created_at)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Por dominio
          </h3>
          {porDominio.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin historial.</p>
          ) : (
            porDominio.map((group) => (
              <section key={group.dominio} className="space-y-2">
                <h4 className="text-base font-semibold">
                  {DOMINIO_LABELS[group.dominio]}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({group.items.length})
                  </span>
                </h4>
                <div className="space-y-2">
                  {group.items.map((e) => (
                    <Link
                      key={e.id}
                      href={`/excepciones/${e.id}`}
                      className="block rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/40"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          {e.id}
                        </span>
                        <EstadoBadge estado={e.estado as EstadoExcepcion} />
                      </div>
                      <p className="mt-1 text-sm">{e.tipo_excepcion}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {e.temporalidad} · solicitud{" "}
                        {formatearFecha(e.fecha_solicitud)} · revisión{" "}
                        {formatearFecha(e.fecha_revision)}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        <aside className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Link2 className="size-3.5" />
            Relacionados
          </h3>
          {relacionados.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No comparte excepciones con otros usuarios o activos.
            </p>
          ) : (
            <div className="space-y-2">
              {relacionados.map((r) => {
                const RIcon = iconForTipo(r.tipo);
                return (
                  <Link
                    key={r.id}
                    href={`/sujetos/${r.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 hover:border-primary/40"
                  >
                    <RIcon className="size-4 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {r.display_name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {TIPO_SUJETO_LABELS[r.tipo]} · {r.total_excepciones}{" "}
                        en común
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emerald" | "amber";
}) {
  const color =
    accent === "emerald"
      ? "text-emerald-700 dark:text-emerald-400"
      : accent === "amber"
        ? "text-amber-700 dark:text-amber-400"
        : "";
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>
        {value}
      </p>
    </div>
  );
}
