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
import { useAuth } from "@/context/auth-context";
import { useExcepciones } from "@/context/excepciones-context";
import { listSujetosDeExcepcionAction } from "@/lib/sujetos/actions";
import { SujetosPicker } from "@/components/sujetos/sujetos-picker";
import type { Sujeto, SujetoInput } from "@/types/sujeto";
import { TIPO_SUJETO_LABELS } from "@/types/sujeto";
import {
  diasHastaRevision,
  fechaAmpliacionPorDefecto,
  formatearFecha,
  formatearFechaHora,
  hoyISO,
  sumarDiasISO,
} from "@/lib/excepciones/utils";
import {
  APROBADOR_OTRA_OPCION,
  ACTOR_OTS_ACTUAL,
  DOMINIO_LABELS,
  DOMINIOS,
  ESTADOS_MANUALES,
  ORIGENES_SOLICITUD,
  TEMPORALIDADES,
  tiposDeDominio,
  type Dominio,
  type EstadoExcepcion,
  type Excepcion,
  type OrigenSolicitud,
  type Temporalidad,
  type TipoExcepcion,
} from "@/types/excepcion";
import { canSetEstadoManual } from "@/types/roles";
import { AprobadorSelect } from "@/components/excepciones/aprobador-select";
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
  dominio: Dominio;
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
    dominio: exc.dominio,
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
  const { can, user } = useAuth();
  const {
    getById,
    loading,
    editar,
    aprobar,
    rechazar,
    cancelar,
    ampliar,
    reactivar,
    comentar,
  } = useExcepciones();

  const excepcion = getById(id);
  const puedeEstadoManual = user ? canSetEstadoManual(user.rol) : false;
  const defaultActor = user?.email ?? ACTOR_OTS_ACTUAL;
  const [panel, setPanel] = useState<PanelAccion>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [sujetos, setSujetos] = useState<Sujeto[]>([]);
  const [editSujetos, setEditSujetos] = useState<SujetoInput[]>([]);
  const [motivo, setMotivo] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [actorOpcion, setActorOpcion] = useState<string>(ACTOR_OTS_ACTUAL);
  const [actorOtro, setActorOtro] = useState("");
  const [comentario, setComentario] = useState("");

  useEffect(() => {
    if (user?.email) setActorOpcion(user.email);
  }, [user?.email]);

  useEffect(() => {
    let cancelled = false;
    void listSujetosDeExcepcionAction(id)
      .then((list) => {
        if (!cancelled) setSujetos(list);
      })
      .catch(() => {
        if (!cancelled) setSujetos([]);
      });
    return () => {
      cancelled = true;
    };
  }, [id, okMsg]);

  useEffect(() => {
    if (excepcion && editing) {
      setEditForm(toEditForm(excepcion));
      setEditSujetos(
        sujetos.map((s) => ({
          tipo: s.tipo,
          clave: s.clave,
          display_name: s.display_name,
        }))
      );
    }
  }, [excepcion, editing, sujetos]);

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
    setActorOpcion(defaultActor);
    setActorOtro("");
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
        sujetos: editSujetos,
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

  async function saveComment() {
    if (!excepcion) return;
    const texto = comentario.trim();
    if (!texto) {
      setError("Escribe un comentario.");
      return;
    }
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      await comentar(excepcion.id, {
        texto,
        actorEmail: user?.email ?? defaultActor,
      });
      setComentario("");
      setOkMsg("Comentario añadido al historial.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar el comentario"
      );
    } finally {
      setBusy(false);
    }
  }

  const puedeAprobar =
    excepcion.estado === "Pendiente" && can("approve", excepcion.dominio);
  const puedeCancelar =
    (excepcion.estado === "Aprobada" ||
      excepcion.estado === "Pendiente" ||
      excepcion.estado === "Caducada") &&
    can("cancel", excepcion.dominio);
  const puedeAmpliar =
    (excepcion.estado === "Aprobada" || excepcion.estado === "Caducada") &&
    can("extend", excepcion.dominio);
  const puedeReactivar =
    (excepcion.estado === "Cancelada" || excepcion.estado === "Rechazada") &&
    can("reactivate", excepcion.dominio);

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
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {DOMINIO_LABELS[excepcion.dominio]}
            </span>
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
              <Label>Dominio</Label>
              <Select
                value={editForm.dominio}
                onValueChange={(v) => {
                  const dominio = v as Dominio;
                  const tipos = tiposDeDominio(dominio);
                  setEditForm((f) =>
                    f
                      ? {
                          ...f,
                          dominio,
                          tipo_excepcion: tipos.includes(f.tipo_excepcion)
                            ? f.tipo_excepcion
                            : tipos[0],
                        }
                      : f
                  );
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOMINIOS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {DOMINIO_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                  {tiposDeDominio(editForm.dominio).map((t) => (
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
              <Label htmlFor="edit-solicitante">Usuario afectado</Label>
              <Input
                id="edit-solicitante"
                value={editForm.solicitante_email}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, solicitante_email: e.target.value } : f
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                Titular del equipo (correlación). Quien pidió la excepción →
                comentario.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-activos">Equipo afectado</Label>
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

            <div className="sm:col-span-2">
              <SujetosPicker value={editSujetos} onChange={setEditSujetos} />
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
              ) : puedeEstadoManual ? (
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
              ) : (
                <>
                  <Input value={editForm.estado} disabled />
                  <p className="text-xs text-muted-foreground">
                    Solo Seguridad puede cambiar el estado desde edición. Usa
                    Aprobar/Rechazar si tienes permiso.
                  </p>
                </>
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
            <AprobadorSelect
              dominio={excepcion.dominio}
              label="Actor (auditoría)"
              id="edit-actor"
              value={actorOpcion}
              otroValue={actorOtro}
              onChange={setActorOpcion}
              onOtroChange={setActorOtro}
            />
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
            <AprobadorSelect
              dominio={excepcion.dominio}
              label="Aprobador / actor"
              id="actor"
              value={actorOpcion}
              otroValue={actorOtro}
              onChange={setActorOpcion}
              onOtroChange={setActorOtro}
            />
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
              <DetailField
                label="Dominio"
                value={DOMINIO_LABELS[excepcion.dominio]}
              />
              <DetailField label="Tipo" value={excepcion.tipo_excepcion} />
              <DetailField label="Origen" value={excepcion.origen_solicitud} />
              {excepcion.origen_solicitud === "Jira" ? (
                <DetailField
                  label="Ticket Jira"
                  value={excepcion.jira_ticket_id ?? "—"}
                />
              ) : null}
              <DetailField
                label="Usuario afectado"
                value={excepcion.solicitante_email}
              />
              <DetailField
                label="Equipo afectado"
                value={excepcion.activo_afectado}
              />
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Vínculos
                </p>
                {sujetos.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sin vínculos (se generan al editar o crear).
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sujetos.map((s) => (
                      <Link
                        key={s.id}
                        href={`/sujetos/${s.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs hover:border-primary/40 hover:bg-primary/5"
                      >
                        <span className="text-muted-foreground">
                          {TIPO_SUJETO_LABELS[s.tipo]}
                        </span>
                        <span className="font-medium">{s.display_name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
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

      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Añadir comentario</CardTitle>
          <CardDescription>
            Queda registrado en el historial de auditoría (sin cambiar el
            estado).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={3}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Nota operativa, seguimiento, contexto de baja…"
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy || !comentario.trim()}
            onClick={() => void saveComment()}
          >
            {busy ? "Guardando…" : "Publicar comentario"}
          </Button>
        </CardContent>
      </Card>

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
