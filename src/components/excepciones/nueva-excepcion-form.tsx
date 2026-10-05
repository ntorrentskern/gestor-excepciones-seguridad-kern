"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarClock,
  ClipboardPen,
  FileText,
  Laptop,
  Shield,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/auth-context";
import { useExcepciones } from "@/context/excepciones-context";
import { fechaRevisionPorDefecto } from "@/lib/excepciones/utils";
import {
  APROBADOR_OTRA_OPCION,
  ACTOR_OTS_ACTUAL,
  DOMINIO_LABELS,
  DOMINIOS,
  ESTADOS_EXCEPCION,
  ORIGENES_SOLICITUD,
  TEMPORALIDADES,
  isDominio,
  tiposDeDominio,
  type Dominio,
  type EstadoExcepcion,
  type OrigenSolicitud,
  type Temporalidad,
  type TipoExcepcion,
} from "@/types/excepcion";
import { canSetEstadoManual } from "@/types/roles";
import { SujetosPicker } from "@/components/sujetos/sujetos-picker";
import { AprobadorSelect } from "@/components/excepciones/aprobador-select";
import {
  mergeSujetosAutoManual,
  type SujetoInput,
} from "@/types/sujeto";
import { suggestTipoSujeto } from "@/lib/sujetos/repository-client";
import {
  parseVinculoFromSearchParams,
  prefillFromVinculo,
} from "@/lib/sujetos/vinculo-helpers";
import { cn } from "@/lib/utils";

function buildInitial(dominio: Dominio) {
  const tipos = tiposDeDominio(dominio);
  return {
    dominio,
    tipo_excepcion: "" as TipoExcepcion | "",
    origen_solicitud: "" as OrigenSolicitud | "",
    jira_ticket_id: "",
    solicitante_email: "",
    activo_afectado: "",
    justificacion: "",
    control_compensatorio: "",
    estado: "Pendiente" as EstadoExcepcion,
    temporalidad: "Temporal" as Temporalidad,
    fecha_revision: fechaRevisionPorDefecto("Temporal"),
    aprobador_opcion: ACTOR_OTS_ACTUAL as string,
    aprobador_otro: "",
    solicitado_por: "",
    _tipos: tipos,
  };
}

function Section({
  icon: Icon,
  title,
  description,
  children,
  accent,
}: {
  icon: typeof Shield;
  title: string;
  description: string;
  children: ReactNode;
  accent?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/80 bg-card/80 p-5 shadow-none",
        "ring-1 ring-black/[0.02] dark:ring-white/[0.04]"
      )}
    >
      <div className="mb-5 flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            accent ?? "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}

export function NuevaExcepcionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { create } = useExcepciones();
  const { user } = useAuth();
  const puedeEstado = user ? canSetEstadoManual(user.rol) : false;

  const dominioInicial = useMemo(() => {
    const q = searchParams.get("dominio");
    if (q && isDominio(q)) return q;
    if (user?.rol === "sistemas") return "sistemas" as Dominio;
    if (user?.rol === "helpdesk") return "helpdesk" as Dominio;
    return "seguridad" as Dominio;
  }, [searchParams, user?.rol]);

  const prefill = useMemo(() => {
    const vinculo = parseVinculoFromSearchParams(
      searchParams,
      suggestTipoSujeto
    );
    return prefillFromVinculo({
      ...vinculo,
      suggestTipo: suggestTipoSujeto,
    });
  }, [searchParams]);

  const [form, setForm] = useState(() => ({
    ...buildInitial(dominioInicial),
    solicitante_email: prefill.solicitante_email,
    activo_afectado: prefill.activo_afectado,
  }));
  const [manualSujetos, setManualSujetos] = useState<SujetoInput[]>(() =>
    prefill.sujetos.filter((s) => !s.auto)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setForm((prev) => {
      if (prev.dominio === dominioInicial) return prev;
      return {
        ...buildInitial(dominioInicial),
        solicitante_email: prev.solicitante_email,
        activo_afectado: prev.activo_afectado,
        origen_solicitud: prev.origen_solicitud,
        jira_ticket_id: prev.jira_ticket_id,
        justificacion: prev.justificacion,
        control_compensatorio: prev.control_compensatorio,
        temporalidad: prev.temporalidad,
        fecha_revision: prev.fecha_revision,
        aprobador_opcion: prev.aprobador_opcion,
        aprobador_otro: prev.aprobador_otro,
        solicitado_por: prev.solicitado_por,
        estado: puedeEstado ? prev.estado : "Pendiente",
      };
    });
  }, [dominioInicial, puedeEstado]);

  useEffect(() => {
    if (!prefill.solicitante_email && !prefill.activo_afectado) return;
    setForm((prev) => ({
      ...prev,
      solicitante_email: prev.solicitante_email || prefill.solicitante_email,
      activo_afectado: prev.activo_afectado || prefill.activo_afectado,
    }));
  }, [prefill]);

  const sujetosMerged = useMemo(
    () =>
      mergeSujetosAutoManual({
        usuarioAfectado: form.solicitante_email,
        equipoAfectado: form.activo_afectado,
        manual: manualSujetos,
      }),
    [form.solicitante_email, form.activo_afectado, manualSujetos]
  );

  const autoSujetos = useMemo(
    () => sujetosMerged.filter((s) => s.auto),
    [sujetosMerged]
  );

  const tiposDisponibles = tiposDeDominio(form.dominio);
  const muestraJira = form.origen_solicitud === "Jira";

  const ayudaRevision = useMemo(() => {
    if (form.temporalidad === "Temporal") {
      return "Por defecto: 6 meses desde hoy (editable).";
    }
    return "Por defecto: 12 meses desde hoy (editable).";
  }, [form.temporalidad]);

  function resolveAprobador(): string | null {
    if (form.aprobador_opcion === APROBADOR_OTRA_OPCION) {
      const otro = form.aprobador_otro.trim();
      return otro || null;
    }
    return form.aprobador_opcion.trim() || null;
  }

  function markTouched(key: string) {
    setTouched((t) => (t[key] ? t : { ...t, [key]: true }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.tipo_excepcion) {
      setError("Selecciona un tipo de excepción.");
      return;
    }
    if (!form.origen_solicitud) {
      setError("Selecciona el origen de la solicitud.");
      return;
    }
    if (form.origen_solicitud === "Jira" && !form.jira_ticket_id.trim()) {
      setError("Indica el ID del ticket de Jira.");
      return;
    }
    if (!form.fecha_revision) {
      setError("Indica la fecha de revisión.");
      return;
    }

    const aprobador = resolveAprobador();
    if (!aprobador) {
      setError("Indica el aprobador (correo o nombre).");
      return;
    }

    try {
      setSubmitting(true);
      const created = await create({
        dominio: form.dominio,
        tipo_excepcion: form.tipo_excepcion,
        origen_solicitud: form.origen_solicitud,
        jira_ticket_id:
          form.origen_solicitud === "Jira" ? form.jira_ticket_id.trim() : null,
        solicitante_email: form.solicitante_email.trim(),
        activo_afectado: form.activo_afectado.trim(),
        justificacion: form.justificacion.trim(),
        control_compensatorio: form.control_compensatorio.trim(),
        estado: puedeEstado ? form.estado : "Pendiente",
        temporalidad: form.temporalidad,
        fecha_revision: form.fecha_revision,
        aprobador_email: aprobador,
        solicitado_por: form.solicitado_por.trim() || undefined,
        sujetos: sujetosMerged.length > 0 ? sujetosMerged : undefined,
      });
      router.push(`/excepciones/${created.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la excepción"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-5">
      <Section
        icon={Shield}
        title="Clasificación"
        description="Dominio y tipo de excepción."
      >
        <Field className="sm:col-span-2">
          <Label>Dominio</Label>
          <div className="grid grid-cols-3 gap-2">
            {DOMINIOS.map((d) => {
              const active = form.dominio === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setForm((f) => ({
                      ...buildInitial(d),
                      origen_solicitud: f.origen_solicitud,
                      jira_ticket_id: f.jira_ticket_id,
                      solicitante_email: f.solicitante_email,
                      activo_afectado: f.activo_afectado,
                      justificacion: f.justificacion,
                      control_compensatorio: f.control_compensatorio,
                      temporalidad: f.temporalidad,
                      fecha_revision: f.fecha_revision,
                      aprobador_opcion: f.aprobador_opcion,
                      aprobador_otro: f.aprobador_otro,
                      solicitado_por: f.solicitado_por,
                      estado: puedeEstado ? f.estado : "Pendiente",
                    }));
                  }}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-sm font-medium transition-all",
                    active
                      ? "border-primary bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/30"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {DOMINIO_LABELS[d]}
                </button>
              );
            })}
          </div>
        </Field>

        <Field className="sm:col-span-2">
          <Label htmlFor="tipo">Tipo de excepción</Label>
          <Select
            value={form.tipo_excepcion || undefined}
            onValueChange={(v) => {
              markTouched("tipo");
              setForm((f) => ({ ...f, tipo_excepcion: v as TipoExcepcion }));
            }}
            required
          >
            <SelectTrigger
              id="tipo"
              className={cn(
                "w-full h-11",
                touched.tipo && form.tipo_excepcion && "border-primary/40"
              )}
            >
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {tiposDisponibles.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Section>

      <Section
        icon={User}
        title="Usuario y equipo (correlación)"
        description="El usuario afectado es el titular del equipo. Así correlamos PC ↔ persona."
        accent="bg-sky-500/10 text-sky-700 dark:text-sky-300"
      >
        <Field>
          <Label htmlFor="usuario-afectado" className="flex items-center gap-1.5">
            <User className="size-3.5 text-muted-foreground" />
            Usuario afectado
          </Label>
          <Input
            id="usuario-afectado"
            required
            value={form.solicitante_email}
            onChange={(e) => {
              markTouched("usuario");
              setForm((f) => ({ ...f, solicitante_email: e.target.value }));
            }}
            placeholder="Titular del equipo · usuario@empresa.com"
            className={cn(
              "h-11",
              form.solicitante_email.trim() && "border-sky-500/40 bg-sky-500/5"
            )}
          />
          <p className="text-xs text-muted-foreground">
            Quien tiene asignado el PC / activo (no quien abre el ticket).
          </p>
        </Field>

        <Field>
          <Label htmlFor="equipo-afectado" className="flex items-center gap-1.5">
            <Laptop className="size-3.5 text-muted-foreground" />
            Equipo afectado
          </Label>
          <Input
            id="equipo-afectado"
            required
            value={form.activo_afectado}
            onChange={(e) => {
              markTouched("equipo");
              setForm((f) => ({ ...f, activo_afectado: e.target.value }));
            }}
            placeholder="Hostname del PC / activo del usuario"
            className={cn(
              "h-11",
              form.activo_afectado.trim() && "border-sky-500/40 bg-sky-500/5"
            )}
          />
          <p className="text-xs text-muted-foreground">
            El equipo de ese usuario. Varios: sepáralos con ;
          </p>
        </Field>

        <Field className="sm:col-span-2">
          <Label htmlFor="solicitado-por">
            Solicitado por{" "}
            <span className="font-normal text-muted-foreground">
              (opcional · si no es el usuario afectado)
            </span>
          </Label>
          <Input
            id="solicitado-por"
            value={form.solicitado_por}
            onChange={(e) =>
              setForm((f) => ({ ...f, solicitado_por: e.target.value }))
            }
            placeholder="Ej. Ana (Helpdesk), ticket HD-123…"
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">
            Se guarda como comentario en el historial, sin mezclarse con la
            correlación usuario ↔ equipo.
          </p>
        </Field>

        <Field className="sm:col-span-2">
          <SujetosPicker
            autoItems={autoSujetos}
            value={manualSujetos}
            onChange={setManualSujetos}
            soloOtro
          />
        </Field>
      </Section>

      <Section
        icon={ClipboardPen}
        title="Origen de la solicitud"
        description="Canal por el que llega la petición."
        accent="bg-amber-500/10 text-amber-800 dark:text-amber-300"
      >
        <Field>
          <Label htmlFor="origen">Origen</Label>
          <Select
            value={form.origen_solicitud || undefined}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                origen_solicitud: v as OrigenSolicitud,
                jira_ticket_id: v === "Jira" ? f.jira_ticket_id : "",
              }))
            }
            required
          >
            <SelectTrigger id="origen" className="w-full h-11">
              <SelectValue placeholder="Correo, Jira, Teams…" />
            </SelectTrigger>
            <SelectContent>
              {ORIGENES_SOLICITUD.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {muestraJira ? (
          <Field>
            <Label htmlFor="jira">ID ticket Jira</Label>
            <Input
              id="jira"
              required
              value={form.jira_ticket_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, jira_ticket_id: e.target.value }))
              }
              placeholder="Ej. SEC-1234"
              className="h-11"
            />
          </Field>
        ) : (
          <Field>
            <Label className="text-muted-foreground">Ticket</Label>
            <p className="flex h-11 items-center rounded-lg border border-dashed border-border px-3 text-sm text-muted-foreground">
              Solo si el origen es Jira
            </p>
          </Field>
        )}
      </Section>

      <Section
        icon={CalendarClock}
        title="Vigencia y aprobación"
        description="Estado, temporalidad y quién valida."
        accent="bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
      >
        {puedeEstado ? (
          <Field>
            <Label htmlFor="estado">Estado inicial</Label>
            <Select
              value={form.estado}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, estado: v as EstadoExcepcion }))
              }
            >
              <SelectTrigger id="estado" className="w-full h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_EXCEPCION.filter(
                  (e) => e === "Pendiente" || e === "Aprobada"
                ).map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : (
          <Field>
            <Label>Estado inicial</Label>
            <p className="flex h-11 items-center rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
              Pendiente (requiere aprobación)
            </p>
          </Field>
        )}

        <Field>
          <Label htmlFor="temporalidad">Temporalidad</Label>
          <Select
            value={form.temporalidad}
            onValueChange={(v) => {
              const temporalidad = v as Temporalidad;
              setForm((f) => ({
                ...f,
                temporalidad,
                fecha_revision: fechaRevisionPorDefecto(temporalidad),
              }));
            }}
          >
            <SelectTrigger id="temporalidad" className="w-full h-11">
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
        </Field>

        <Field>
          <Label htmlFor="revision">Fecha de revisión</Label>
          <Input
            id="revision"
            type="date"
            required
            value={form.fecha_revision}
            onChange={(e) =>
              setForm((f) => ({ ...f, fecha_revision: e.target.value }))
            }
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">{ayudaRevision}</p>
        </Field>

        <Field className="sm:col-span-2">
          <AprobadorSelect
            dominio={form.dominio}
            value={form.aprobador_opcion}
            otroValue={form.aprobador_otro}
            onChange={(v) => setForm((f) => ({ ...f, aprobador_opcion: v }))}
            onOtroChange={(v) =>
              setForm((f) => ({ ...f, aprobador_otro: v }))
            }
          />
        </Field>
      </Section>

      <Section
        icon={FileText}
        title="Justificación"
        description="Motivo de negocio y controles compensatorios."
        accent="bg-violet-500/10 text-violet-800 dark:text-violet-300"
      >
        <Field className="sm:col-span-2">
          <Label htmlFor="justificacion">Justificación</Label>
          <Textarea
            id="justificacion"
            required
            rows={4}
            value={form.justificacion}
            onChange={(e) =>
              setForm((f) => ({ ...f, justificacion: e.target.value }))
            }
            placeholder="Describe el motivo de negocio…"
            className="min-h-[100px] resize-y"
          />
        </Field>

        <Field className="sm:col-span-2">
          <Label htmlFor="control">Control compensatorio</Label>
          <Textarea
            id="control"
            rows={3}
            value={form.control_compensatorio}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                control_compensatorio: e.target.value,
              }))
            }
            placeholder="Mitigaciones: logs, allowlist, cifrado, supervisión…"
            className="resize-y"
          />
        </Field>
      </Section>

      {error ? (
        <p
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-800 dark:text-rose-200"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <p className="text-xs text-muted-foreground">
          {autoSujetos.length} vínculo{autoSujetos.length === 1 ? "" : "s"} auto
          {manualSujetos.length > 0
            ? ` · ${manualSujetos.length} manual${manualSujetos.length === 1 ? "" : "es"}`
            : ""}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/excepciones")}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting} className="min-w-[160px]">
            {submitting ? "Guardando…" : "Guardar excepción"}
          </Button>
        </div>
      </div>
    </form>
  );
}
