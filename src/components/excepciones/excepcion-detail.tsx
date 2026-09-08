"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  RotateCcw,
  ShieldX,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AuditTimeline } from "@/components/excepciones/audit-timeline";
import {
  EstadoBadge,
} from "@/components/excepciones/estado-badge";
import { useExcepciones } from "@/context/excepciones-context";
import { fechaAmpliacionPorDefecto } from "@/lib/excepciones/repository";
import {
  diasHastaRevision,
  formatearFecha,
  formatearFechaHora,
  hoyISO,
  sumarDiasISO,
} from "@/lib/excepciones/utils";
import { ACTOR_OTS_ACTUAL } from "@/types/excepcion";

type PanelAccion = "aprobar" | "rechazar" | "cancelar" | "ampliar" | "reactivar" | null;

export function ExcepcionDetail({ id }: { id: string }) {
  const router = useRouter();
  const {
    getById,
    loading,
    aprobar,
    rechazar,
    cancelar,
    ampliar,
    reactivar,
  } = useExcepciones();

  const excepcion = getById(id);
  const [panel, setPanel] = useState<PanelAccion>(null);
  const [motivo, setMotivo] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const dias = useMemo(
    () => (excepcion ? diasHastaRevision(excepcion.fecha_revision) : 0),
    [excepcion]
  );

  if (loading && !excepcion) {
    return <p className="text-sm text-muted-foreground">Cargando detalle…</p>;
  }

  if (!excepcion) {
    return (
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Excepción no encontrada</CardTitle>
          <CardDescription>
            No existe un registro con ID {id} en el almacén local.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/excepciones">
              <ArrowLeft className="size-4" />
              Volver al listado
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  function openPanel(next: PanelAccion) {
    setError(null);
    setOkMsg(null);
    setMotivo("");
    if (next === "ampliar") {
      setNuevaFecha(fechaAmpliacionPorDefecto(excepcion!.fecha_revision));
    } else if (next === "reactivar") {
      setNuevaFecha(sumarDiasISO(hoyISO(), 30));
    } else {
      setNuevaFecha("");
    }
    setPanel(next);
  }

  async function runAction() {
    if (!excepcion) return;
    setBusy(true);
    setError(null);
    setOkMsg(null);

    try {
      if (panel === "aprobar") {
        await aprobar(excepcion.id, { motivo });
        setOkMsg("Excepción aprobada.");
      } else if (panel === "rechazar") {
        await rechazar(excepcion.id, { motivo });
        setOkMsg("Excepción rechazada.");
      } else if (panel === "cancelar") {
        await cancelar(excepcion.id, { motivo });
        setOkMsg("Excepción cancelada.");
      } else if (panel === "ampliar") {
        await ampliar(excepcion.id, {
          nuevaFechaRevision: nuevaFecha,
          motivo: motivo || "Ampliación de vigencia.",
        });
        setOkMsg("Fecha de revisión ampliada.");
      } else if (panel === "reactivar") {
        await reactivar(excepcion.id, {
          nuevaFechaRevision: nuevaFecha,
          motivo,
        });
        setOkMsg("Excepción reactivada.");
      }
      setPanel(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción");
    } finally {
      setBusy(false);
    }
  }

  const puedeAprobar = excepcion.estado === "Pendiente";
  const puedeCancelar =
    excepcion.estado === "Aprobada" || excepcion.estado === "Pendiente";
  const puedeAmpliar = excepcion.estado === "Aprobada";
  const puedeReactivar =
    excepcion.estado === "Cancelada" ||
    excepcion.estado === "Caducada" ||
    excepcion.estado === "Rechazada";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground"
            onClick={() => router.push("/excepciones")}
          >
            <ArrowLeft className="size-4" />
            Volver
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-mono text-2xl font-semibold tracking-tight text-foreground">
              {excepcion.id}
            </h2>
            <EstadoBadge estado={excepcion.estado} />
          </div>
          <p className="text-sm text-muted-foreground">
            {excepcion.tipo_excepcion} · {excepcion.temporalidad} · revisión{" "}
            {formatearFecha(excepcion.fecha_revision)}
            {excepcion.estado === "Aprobada" || excepcion.estado === "Pendiente"
              ? ` (${dias < 0 ? `${Math.abs(dias)}d vencida` : `${dias}d restantes`})`
              : null}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {puedeAprobar ? (
            <>
              <Button size="sm" onClick={() => openPanel("aprobar")}>
                <CheckCircle2 className="size-4" />
                Aprobar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openPanel("rechazar")}
              >
                <XCircle className="size-4" />
                Rechazar
              </Button>
            </>
          ) : null}
          {puedeAmpliar ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openPanel("ampliar")}
            >
              <CalendarClock className="size-4" />
              Ampliar
            </Button>
          ) : null}
          {puedeCancelar ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openPanel("cancelar")}
            >
              <ShieldX className="size-4" />
              Cancelar
            </Button>
          ) : null}
          {puedeReactivar ? (
            <Button size="sm" onClick={() => openPanel("reactivar")}>
              <RotateCcw className="size-4" />
              Reactivar
            </Button>
          ) : null}
        </div>
      </div>

      {okMsg ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {okMsg}
        </p>
      ) : null}

      {panel ? (
        <Card className="shadow-none ring-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base capitalize">
              {panel === "aprobar" && "Aprobar excepción"}
              {panel === "rechazar" && "Rechazar excepción"}
              {panel === "cancelar" && "Cancelar excepción"}
              {panel === "ampliar" && "Ampliar fecha de revisión"}
              {panel === "reactivar" && "Reactivar excepción"}
            </CardTitle>
            <CardDescription>
              Actor: {ACTOR_OTS_ACTUAL} (simulado Fase 1). La acción quedará en
              el historial de auditoría.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(panel === "ampliar" || panel === "reactivar") && (
              <div className="space-y-2">
                <Label htmlFor="nueva-fecha">Nueva fecha de revisión</Label>
                <Input
                  id="nueva-fecha"
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo / comentario</Label>
              <Textarea
                id="motivo"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Describe el motivo de la decisión…"
              />
            </div>
            {error ? (
              <p className="text-sm text-rose-700" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button onClick={() => void runAction()} disabled={busy}>
                {busy ? "Aplicando…" : "Confirmar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPanel(null)}
                disabled={busy}
              >
                Cerrar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Detalle de la excepción</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Tipo" value={excepcion.tipo_excepcion} />
            <DetailField label="Origen" value={excepcion.origen_peticion} />
            <DetailField
              label="Solicitante"
              value={excepcion.solicitante_email}
            />
            <DetailField
              label="Activo afectado"
              value={excepcion.activo_afectado}
            />
            <DetailField
              label="Fecha solicitud"
              value={formatearFecha(excepcion.fecha_solicitud)}
            />
            <DetailField
              label="Fecha revisión"
              value={formatearFecha(excepcion.fecha_revision)}
            />
            <DetailField
              label="Aprobador / decisor"
              value={excepcion.aprobador_email ?? "—"}
            />
            <DetailField
              label="Fecha decisión"
              value={
                excepcion.fecha_decision
                  ? formatearFecha(excepcion.fecha_decision)
                  : "—"
              }
            />
            <div className="sm:col-span-2">
              <DetailField
                label="Justificación"
                value={excepcion.justificacion}
              />
            </div>
            <div className="sm:col-span-2">
              <DetailField
                label="Control compensatorio"
                value={
                  excepcion.control_compensatorio?.trim()
                    ? excepcion.control_compensatorio
                    : "No indicado"
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Estado</span>
              <EstadoBadge estado={excepcion.estado} />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Eventos auditoría</span>
              <span className="font-semibold tabular-nums">
                {excepcion.historial.length}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Último cambio</span>
              <span className="text-right text-xs">
                {excepcion.historial[0]
                  ? formatearFechaHora(excepcion.historial[0].timestamp)
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <AuditTimeline historial={excepcion.historial} />
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  );
}
