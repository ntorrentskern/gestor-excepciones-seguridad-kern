"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AppWindow,
  ArrowLeft,
  Loader2,
  Monitor,
  PlusCircle,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EstadoBadge } from "@/components/excepciones/estado-badge";
import { EventoOperativoPanel } from "@/components/operaciones/evento-operativo-panel";
import {
  getCmdbFichaAction,
  unlinkCmdbSujetoAction,
} from "@/lib/cmdb/actions";
import { listEventosOperativosAction } from "@/lib/operaciones/actions";
import { buildNuevaExcepcionRelacionadaHref } from "@/lib/sujetos/vinculo-helpers";
import { formatearFecha, formatearFechaHora } from "@/lib/excepciones/utils";
import type { CmdbAutorizacion, CmdbFicha } from "@/types/cmdb";
import { TIPO_SUJETO_LABELS } from "@/types/sujeto";
import {
  TIPO_EVENTO_OPERATIVO_LABELS,
  type EventoOperativo,
} from "@/types/operaciones";
import { DOMINIO_LABELS } from "@/types/dominio";
import { cn } from "@/lib/utils";
import {
  BadgeStack,
  HostBadge,
  ServicioBadge,
  UsuarioBadge,
} from "@/components/cmdb/cmdb-badges";

function iconForTipo(tipo: string) {
  if (tipo === "usuario") return User;
  if (tipo === "servicio") return AppWindow;
  return Monitor;
}

function revisionUrgente(fecha: string): boolean {
  if (!fecha) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(fecha + "T00:00:00");
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 15);
  return d >= today && d <= limit;
}

function revisionVencida(fecha: string): boolean {
  if (!fecha) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(fecha + "T00:00:00");
  return d < today;
}

export function CmdbFicha({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ficha, setFicha] = useState<CmdbFicha | null>(null);
  const [eventos, setEventos] = useState<EventoOperativo[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCmdbFichaAction(id);
      setFicha(data);
      if (
        data &&
        (data.sujeto.tipo === "usuario" || data.sujeto.tipo === "activo")
      ) {
        const ops = await listEventosOperativosAction(id);
        setEventos(ops);
      } else {
        setEventos([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
      setFicha(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onUnlink(excId: string) {
    if (!confirm(`¿Desvincular esta entidad de ${excId}?`)) return;
    setBusy(true);
    try {
      const result = await unlinkCmdbSujetoAction(excId, id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await reload();
    } finally {
      setBusy(false);
    }
  }

  const impactoResumen = useMemo(() => {
    if (!ficha) return "";
    const parts: string[] = [];
    if (ficha.impactoServicios.length)
      parts.push(`${ficha.impactoServicios.length} servicio(s)`);
    if (ficha.impactoEquipos.length)
      parts.push(`${ficha.impactoEquipos.length} equipo(s)`);
    if (ficha.impactoUsuarios.length)
      parts.push(`${ficha.impactoUsuarios.length} usuario(s)`);
    return parts.join(" · ");
  }, [ficha]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Cargando ficha…
      </p>
    );
  }

  if (error && !ficha) {
    return (
      <p className="text-sm text-rose-700" role="alert">
        {error}
      </p>
    );
  }

  if (!ficha) {
    return (
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Registro no encontrado</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link href="/cmdb">
              <ArrowLeft className="size-4" />
              Volver a CMDB
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { sujeto, metrics, autorizaciones } = ficha;
  const Icon = iconForTipo(sujeto.tipo);
  const showOps = sujeto.tipo === "usuario" || sujeto.tipo === "activo";
  const isServicio = sujeto.tipo === "servicio";
  const isUsuario = sujeto.tipo === "usuario";
  const isActivo = sujeto.tipo === "activo";

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/cmdb">
              <ArrowLeft className="size-4" />
              CMDB
            </Link>
          </Button>
          <div className="flex items-start gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {TIPO_SUJETO_LABELS[sujeto.tipo]}
              </p>
              <h2 className="text-xl font-semibold tracking-tight">
                {sujeto.display_name}
              </h2>
              {sujeto.clave.toLowerCase() !==
              sujeto.display_name.toLowerCase() ? (
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {sujeto.clave}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <Button asChild size="sm">
          <Link href={buildNuevaExcepcionRelacionadaHref(sujeto)}>
            <PlusCircle className="size-4" />
            Nueva excepción relacionada
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Excepciones" value={metrics.total} />
        <Metric label="Activas" value={metrics.activas} tone="emerald" />
        <Metric label="Pendientes" value={metrics.pendientes} tone="amber" />
        <Metric
          label="Revisión ≤ 15 d"
          value={metrics.revisionProximas}
          tone="orange"
        />
      </div>

      {showOps ? (
        <Card className="shadow-none border-amber-500/25 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Impacto operativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {impactoResumen
                ? `Al generar una baja o cambio se revisarán: ${impactoResumen}.`
                : "Sin correlaciones de impacto registradas."}
            </p>
            <div className="flex flex-wrap gap-3">
              {ficha.impactoServicios.length > 0 ? (
                <div>
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Servicios
                  </p>
                  <BadgeStack>
                    {ficha.impactoServicios.map((s) => (
                      <ServicioBadge key={s.id || s.clave} item={s} />
                    ))}
                  </BadgeStack>
                </div>
              ) : null}
              {ficha.impactoEquipos.length > 0 ? (
                <div>
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Equipos
                  </p>
                  <BadgeStack>
                    {ficha.impactoEquipos.map((e) => (
                      <HostBadge key={e.id || e.clave} item={e} />
                    ))}
                  </BadgeStack>
                </div>
              ) : null}
              {ficha.impactoUsuarios.length > 0 ? (
                <div>
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Usuarios
                  </p>
                  <BadgeStack>
                    {ficha.impactoUsuarios.map((u) => (
                      <UsuarioBadge key={u.id || u.clave} item={u} />
                    ))}
                  </BadgeStack>
                </div>
              ) : null}
            </div>
            <EventoOperativoPanel
              sujetoId={sujeto.id}
              tipoPreferido={
                sujeto.tipo === "usuario" ? "BajaUsuario" : "CambioDispositivo"
              }
            />
            {eventos.length > 0 ? (
              <div className="space-y-1.5 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Eventos recientes
                </p>
                {eventos.map((ev) => (
                  <Link
                    key={ev.id}
                    href={`/operaciones/${ev.id}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs hover:border-primary/40"
                  >
                    <span>
                      {TIPO_EVENTO_OPERATIVO_LABELS[ev.tipo]} · {ev.estado}
                    </span>
                    <span className="text-muted-foreground">
                      {formatearFechaHora(ev.created_at)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <p className="text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="shadow-none overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Autorizaciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {autorizaciones.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Sin excepciones vinculadas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {!isUsuario ? (
                    <TableHead className="pl-3">Usuario</TableHead>
                  ) : null}
                  {!isActivo ? <TableHead>Equipo</TableHead> : null}
                  {!isServicio ? (
                    <TableHead className={isUsuario ? "pl-3" : undefined}>
                      Servicio / Herramienta
                    </TableHead>
                  ) : null}
                  <TableHead>Excepción</TableHead>
                  <TableHead>Revisión</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="pr-3 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {autorizaciones.map((a) => (
                  <AuthRow
                    key={a.excepcion_id}
                    row={a}
                    sujetoTipo={sujeto.tipo}
                    busy={busy}
                    onUnlink={() => void onUnlink(a.excepcion_id)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AuthRow({
  row,
  sujetoTipo,
  busy,
  onUnlink,
}: {
  row: CmdbAutorizacion;
  sujetoTipo: string;
  busy: boolean;
  onUnlink: () => void;
}) {
  const urgente = revisionUrgente(row.fecha_revision);
  const vencida = revisionVencida(row.fecha_revision);
  const isServicio = sujetoTipo === "servicio";
  const isUsuario = sujetoTipo === "usuario";
  const isActivo = sujetoTipo === "activo";

  return (
    <TableRow>
      {!isUsuario ? (
        <TableCell className="py-2 pl-3 align-top">
          {row.usuario ? (
            <div className="min-w-0">
              <UsuarioBadge item={row.usuario} />
              <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                {row.usuario.clave}
              </p>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
      ) : null}

      {!isActivo ? (
        <TableCell className="py-2 align-top">
          {row.equipo ? (
            <HostBadge item={row.equipo} />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
      ) : null}

      {!isServicio ? (
        <TableCell
          className={cn("py-2 align-top", isUsuario && "pl-3")}
        >
          {row.servicios.length > 0 ? (
            <BadgeStack>
              {row.servicios.map((s) => (
                <ServicioBadge key={s.id || s.clave} item={s} />
              ))}
            </BadgeStack>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
      ) : null}

      <TableCell className="py-2 align-top">
        <Link
          href={`/excepciones/${row.excepcion_id}`}
          className="font-mono text-xs font-medium text-primary hover:underline"
        >
          {row.excepcion_id}
        </Link>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {DOMINIO_LABELS[row.dominio]} · {row.tipo_excepcion}
        </p>
      </TableCell>
      <TableCell className="py-2 align-top">
        <span
          className={cn(
            "text-xs tabular-nums",
            vencida && "font-medium text-rose-700 dark:text-rose-300",
            urgente &&
              !vencida &&
              "font-medium text-amber-700 dark:text-amber-300"
          )}
        >
          {formatearFecha(row.fecha_revision)}
        </span>
      </TableCell>
      <TableCell className="py-2 align-top">
        <EstadoBadge estado={row.estado} />
      </TableCell>
      <TableCell className="py-2 pr-3 text-right align-top">
        <div className="inline-flex flex-col items-end gap-1">
          <Button asChild variant="outline" size="sm" className="h-7 text-xs">
            <Link href={`/excepciones/${row.excepcion_id}`}>Ver</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            disabled={busy}
            onClick={onUnlink}
          >
            Desvincular
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "emerald" | "amber" | "orange";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "amber"
        ? "text-amber-700 dark:text-amber-400"
        : tone === "orange"
          ? "text-orange-700 dark:text-orange-400"
          : "";
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-0.5 text-xl font-semibold tabular-nums", color)}>
        {value}
      </p>
    </div>
  );
}
