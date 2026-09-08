"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Pencil,
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
import { EstadoBadge } from "@/components/excepciones/estado-badge";
import { useExcepciones } from "@/context/excepciones-context";
import {
  diasHastaRevision,
  fechaAmpliacionPorDefecto,
  formatearFecha,
  formatearFechaHora,
  hoyISO,
  sumarDiasISO,
} from "@/lib/excepciones/utils";
import {
  APROBADORES_PREDEFINIDOS,
  APROBADOR_OTRA_OPCION,
  ACTOR_OTS_ACTUAL,
  ESTADOS_MANUALES,
  ORIGENES_SOLICITUD,
  TEMPORALIDADES,
  TIPOS_EXCEPCION,
  type EstadoExcepcion,
  type Excepcion,
  type OrigenSolicitud,
  type Temporalidad,
  type TipoExcepcion,
} from "@/types/excepcion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PanelAccion =
  | "aprobar"
  | "rechazar"
  | "cancelar"
  | "ampliar"
  | "reactivar"
  | null;

type EditForm = {
  tipo_excepcion: TipoExcepcion;
  origen_solicitud: OrigenSolicitud;
  jira_ticket_id: string;
  solicitante_email: string;
  activo_afectado: string;
  justificacion: string;
  control_compensatorio: string;
  estado: EstadoExcepcion;
  temporalidad: Temporalidad;
  fecha_revision: string;
  motivo: string;
};

function toEditForm(exc: Excepcion): EditForm {
  return {
    tipo_excepcion: exc.tipo_excepcion,
    origen_solicitud: exc.origen_solicitud,
    jira_ticket_id: exc.jira_ticket_id ?? "",
    solicitante_email: exc.solicitante_email,
    activo_afectado: exc.activo_afectado,
    justificacion: exc.justificacion,
    control_compensatorio: exc.control_compensatorio ?? "",
    estado: exc.estado,
    temporalidad: exc.temporalidad,
    fecha_revision: exc.fecha_revision,
    motivo: "",
  };
}

export function ExcepcionDetail({ id }: { id: string }) {
  const router = useRouter();
  const {
    getById,
    loading,
    editar,
    aprobar,
    rechazar,
    cancelar,
    ampliar,
    reactivar,
  } = useExcepciones();

  const excepcion = getById(id);
  const [panel, setPanel] = useState<PanelAccion>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [motivo, setMotivo] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [actorOpcion, setActorOpcion] = useState<string>(ACTOR_OTS_ACTUAL);
  const [actorOtro, setActorOtro] = useState("");

  useEffect(() => {
    if (excepcion && editing) {
      setEditForm(toEditForm(excepcion));
    }
  }, [excepcion, editing]);

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
            No existe un registro con ID {id} en la base de datos.
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

  function initActorFromExcepcion() {
    setActorOpcion(
      excepcion?.aprobador_email &&
        (APROBADORES_PREDEFINIDOS as readonly string[]).includes(
          excepcion.aprobador_email
        )
        ? excepcion.aprobador_email
        : excepcion?.aprobador_email
          ? APROBADOR_OTRA_OPCION
          : ACTOR_OTS_ACTUAL
    );
    setActorOtro(
      excepcion?.aprobador_email &&
        !(APROBADORES_PREDEFINIDOS as readonly string[]).includes(
          excepcion.aprobador_email
        )
        ? excepcion.aprobador_email
        : ""
    );
  }

  function openPanel(next: PanelAccion) {
    setError(null);
    setOkMsg(null);
    setMotivo("");
    setEditing(false);
    initActorFromExcepcion();
    if (next === "ampliar") {
      setNuevaFecha(fechaAmpliacionPorDefecto(excepcion!.fecha_revision));
    } else if (next === "reactivar") {
      setNuevaFecha(sumarDiasISO(hoyISO(), 30));
    } else {
      setNuevaFecha("");
    }
    setPanel(next);
  }

  function startEdit() {
    setPanel(null);
    setError(null);
    setOkMsg(null);
    initActorFromExcepcion();
    setEditForm(toEditForm(excepcion!));
    setEditing(true);
  }

  function resolveActor(): string | null {
    if (actorOpcion === APROBADOR_OTRA_OPCION) {
      const otro = actorOtro.trim();
      return otro || null;
    }
    return actorOpcion.trim() || null;
  }

  async function runAction() {
    if (!excepcion) return;
    const actorEmail = resolveActor();
    if (!actorEmail) {
      setError("Indica el aprobador (correo o nombre).");
      return;
    }

    setBusy(true);
    setError(null);
    setOkMsg(null);

    try {
      if (panel === "aprobar") {
        await aprobar(excepcion.id, { motivo, actorEmail });
        setOkMsg("Excepción aprobada.");
      } else if (panel === "rechazar") {
        await rechazar(excepcion.id, { motivo, actorEmail });
        setOkMsg("Excepción rechazada.");
      } else if (panel === "cancelar") {
        await cancelar(excepcion.id, { motivo, actorEmail });
        setOkMsg("Excepción cancelada.");
      } else if (panel === "ampliar") {
        await ampliar(excepcion.id, {
          nuevaFechaRevision: nuevaFecha,
          motivo: motivo || "Ampliación de vigencia.",
          actorEmail,
        });
        setOkMsg("Fecha de revisión ampliada.");
      } else if (panel === "reactivar") {
        await reactivar(excepcion.id, {
          nuevaFechaRevision: nuevaFecha,
          motivo,
          actorEmail,
        });
        setOkMsg("Excepción reactivada.");
      }
      setPanel(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo completar la acción"
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!excepcion || !editForm) return;
    const actorEmail = resolveActor();
    if (!actorEmail) {
      setError("Indica el actor de la edición.");
      return;
    }
    if (editForm.origen_solicitud === "Jira" && !editForm.jira_ticket_id.trim()) {
      setError("Indica el ID del ticket de Jira.");
      return;
    }

    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      await editar(excepcion.id, {
        ...editForm,
        jira_ticket_id:
          editForm.origen_solicitud === "Jira"
            ? editForm.jira_ticket_id.trim()
            : null,
        actorEmail,
        motivo: editForm.motivo.trim() || undefined,
      });
      setOkMsg("Cambios guardados. Quedan registrados en auditoría.");
      setEditing(false);
      setEditForm(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la edición"
      );
    } finally {
      setBusy(false);
    }
  }

  const puedeAprobar = excepcion.estado === "Pendiente";
  const puedeCancelar =
    excepcion.estado === "Aprobada" ||
    excepcion.estado === "Pendiente" ||
    excepcion.estado === "Caducada";
  const puedeAmpliar =
    excepcion.estado === "Aprobada" || excepcion.estado === "Caducada";
  const puedeReactivar =
    excepcion.estado === "Cancelada" || excepcion.estado === "Rechazada";

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
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Pencil className="size-4" />
            Editar
          </Button>
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
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {okMsg}
        </p>
      ) : null}

      {editing && editForm ? (
        <Card className="shadow-none ring-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Editar excepción</CardTitle>
            <CardDescription>
              Corrige datos erróneos. Los cambios quedan en el historial de
              auditoría.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={editForm.tipo_excepcion}
                onValueChange={(v) =>
                  setEditForm((f) =>
                    f ? { ...f, tipo_excepcion: v as TipoExcepcion } : f
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_EXCEPCION.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Origen</Label>
              <Select
                value={editForm.origen_solicitud}
                onValueChange={(v) =>
                  setEditForm((f) =>
                    f
                      ? {
                          ...f,
                          origen_solicitud: v as OrigenSolicitud,
                          jira_ticket_id:
                            v === "Jira" ? f.jira_ticket_id : "",
                        }
                      : f
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORIGENES_SOLICITUD.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editForm.origen_solicitud === "Jira" ? (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-jira">Ticket Jira</Label>
                <Input
                  id="edit-jira"
                  value={editForm.jira_ticket_id}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, jira_ticket_id: e.target.value } : f
                    )
                  }
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="edit-solicitante">Solicitante</Label>
              <Input
                id="edit-solicitante"
                value={editForm.solicitante_email}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, solicitante_email: e.target.value } : f
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-activos">Activos afectados</Label>
              <Input
                id="edit-activos"
                value={editForm.activo_afectado}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, activo_afectado: e.target.value } : f
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              {editForm.estado === "Caducada" ? (
                <>
                  <Input value="Caducada (automático por fecha)" disabled />
                  <p className="text-xs text-muted-foreground">
                    Usa Ampliar para renovar o Cancelar para cerrar.
                  </p>
                </>
              ) : (
                <Select
                  value={editForm.estado}
                  onValueChange={(v) =>
                    setEditForm((f) =>
                      f ? { ...f, estado: v as EstadoExcepcion } : f
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_MANUALES.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Temporalidad</Label>
              <Select
                value={editForm.temporalidad}
                onValueChange={(v) =>
                  setEditForm((f) =>
                    f ? { ...f, temporalidad: v as Temporalidad } : f
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPORALIDADES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-revision">Fecha revisión</Label>
              <Input
                id="edit-revision"
                type="date"
                value={editForm.fecha_revision}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, fecha_revision: e.target.value } : f
                  )
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-justificacion">Justificación</Label>
              <Textarea
                id="edit-justificacion"
                rows={3}
                value={editForm.justificacion}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, justificacion: e.target.value } : f
                  )
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-control">Control compensatorio</Label>
              <Textarea
                id="edit-control"
                rows={2}
                value={editForm.control_compensatorio}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, control_compensatorio: e.target.value } : f
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Actor (auditoría)</Label>
              <Select value={actorOpcion} onValueChange={setActorOpcion}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APROBADORES_PREDEFINIDOS.map((email) => (
                    <SelectItem key={email} value={email}>
                      {email}
                    </SelectItem>
                  ))}
                  <SelectItem value={APROBADOR_OTRA_OPCION}>
                    Otra opción
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {actorOpcion === APROBADOR_OTRA_OPCION ? (
              <div className="space-y-2">
                <Label htmlFor="edit-actor-otro">Correo o nombre</Label>
                <Input
                  id="edit-actor-otro"
                  value={actorOtro}
                  onChange={(e) => setActorOtro(e.target.value)}
                />
              </div>
            ) : null}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-motivo">Motivo de la edición (opcional)</Label>
              <Textarea
                id="edit-motivo"
                rows={2}
                value={editForm.motivo}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, motivo: e.target.value } : f
                  )
                }
                placeholder="Ej. Corrección de tipografía en activos…"
              />
            </div>
            {error ? (
              <p className="sm:col-span-2 text-sm text-rose-700" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex gap-2 sm:col-span-2">
              <Button onClick={() => void saveEdit()} disabled={busy}>
                {busy ? "Guardando…" : "Guardar cambios"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setEditForm(null);
                  setError(null);
                }}
                disabled={busy}
              >
                Cancelar edición
              </Button>
            </div>
          </CardContent>
        </Card>
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
              La acción quedará en el historial de auditoría en Neon.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="actor">Aprobador / actor</Label>
              <Select value={actorOpcion} onValueChange={setActorOpcion}>
                <SelectTrigger id="actor" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APROBADORES_PREDEFINIDOS.map((email) => (
                    <SelectItem key={email} value={email}>
                      {email}
                    </SelectItem>
                  ))}
                  <SelectItem value={APROBADOR_OTRA_OPCION}>
                    Otra opción
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {actorOpcion === APROBADOR_OTRA_OPCION ? (
              <div className="space-y-2">
                <Label htmlFor="actor-otro">Correo o nombre</Label>
                <Input
                  id="actor-otro"
                  value={actorOtro}
                  onChange={(e) => setActorOtro(e.target.value)}
                  placeholder="nombre@empresa.com o Nombre Apellido"
                />
              </div>
            ) : null}
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

      {!editing ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="shadow-none lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Detalle de la excepción</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Tipo" value={excepcion.tipo_excepcion} />
              <DetailField label="Origen" value={excepcion.origen_solicitud} />
              {excepcion.origen_solicitud === "Jira" ? (
                <DetailField
                  label="Ticket Jira"
                  value={excepcion.jira_ticket_id ?? "—"}
                />
              ) : null}
              <DetailField
                label="Solicitante"
                value={excepcion.solicitante_email}
              />
              <DetailField
                label="Activos afectados"
                value={excepcion.activo_afectado}
              />
              <DetailField label="Temporalidad" value={excepcion.temporalidad} />
              <DetailField
                label="Fecha solicitud"
                value={formatearFecha(excepcion.fecha_solicitud)}
              />
              <DetailField
                label="Fecha revisión"
                value={formatearFecha(excepcion.fecha_revision)}
              />
              <DetailField
                label="Registrador / aprobador"
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
      ) : null}

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
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{value}</p>
    </div>
  );
}
