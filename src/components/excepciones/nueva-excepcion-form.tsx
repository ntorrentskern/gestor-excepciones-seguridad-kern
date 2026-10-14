"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarClock,
  ClipboardPen,
  FileText,
  Laptop,
  Plus,
  Shield,
  Trash2,
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
import { useSandbox } from "@/context/sandbox-context";
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

type ParAfectado = {
  key: string;
  usuario: string;
  pc: string;
};

function nuevoPar(usuario = "", pc = ""): ParAfectado {
  return {
    key:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    usuario,
    pc,
  };
}

function paresListos(pares: ParAfectado[]): {
  error: string | null;
  pares: Array<{ usuario: string; pc: string }>;
} {
  const conAlgo = pares
    .map((p) => ({ usuario: p.usuario.trim(), pc: p.pc.trim() }))
    .filter((p) => p.usuario || p.pc);

  if (conAlgo.length === 0) {
    return { error: "Indica al menos un usuario y su PC.", pares: [] };
  }

  const incompleto = conAlgo.find((p) => !p.usuario || !p.pc);
  if (incompleto) {
    return {
      error: "Cada fila necesita el usuario y el PC. Quita las que estén a medias.",
      pares: [],
    };
  }

  return { error: null, pares: conAlgo };
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
  const { createMany, refresh } = useExcepciones();
  const { user } = useAuth();
  const { enabled: sandboxEnabled } = useSandbox();
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

  const [form, setForm] = useState(() => buildInitial(dominioInicial));
  const [pares, setPares] = useState<ParAfectado[]>(() => [
    nuevoPar(prefill.solicitante_email, prefill.activo_afectado),
  ]);
  const [creadas, setCreadas] = useState<
    Array<{ id: string; usuario: string; pc: string }> | null
  >(null);
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
    setPares((prev) => {
      const first = prev[0];
      if (!first || first.usuario.trim() || first.pc.trim()) return prev;
      const next = [...prev];
      next[0] = {
        ...first,
        usuario: prefill.solicitante_email,
        pc: prefill.activo_afectado,
      };
      return next;
    });
  }, [prefill]);

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

    const afectados = paresListos(pares);
    if (afectados.error) {
      setError(afectados.error);
      return;
    }

    const aprobador = resolveAprobador();
    if (!aprobador) {
      setError("Indica el aprobador (correo o nombre).");
      return;
    }

    try {
      setSubmitting(true);
      const compartido = {
        dominio: form.dominio,
        tipo_excepcion: form.tipo_excepcion,
        origen_solicitud: form.origen_solicitud,
        jira_ticket_id:
          form.origen_solicitud === "Jira" ? form.jira_ticket_id.trim() : null,
        justificacion: form.justificacion.trim(),
        control_compensatorio: form.control_compensatorio.trim(),
        estado: puedeEstado ? form.estado : "Pendiente",
        temporalidad: form.temporalidad,
        fecha_revision: form.fecha_revision,
        aprobador_email: aprobador,
        solicitado_por: form.solicitado_por.trim() || undefined,
        is_sandbox: sandboxEnabled || undefined,
      };
      const created = await createMany(
        afectados.pares.map((par) => {
          const sujetos = mergeSujetosAutoManual({
            usuarioAfectado: par.usuario,
            equipoAfectado: par.pc,
            manual: manualSujetos,
          });
          return {
            ...compartido,
            solicitante_email: par.usuario,
            activo_afectado: par.pc,
            sujetos: sujetos.length > 0 ? sujetos : undefined,
          };
        })
      );
      if (created.length === 1) {
        router.push(`/excepciones/${created[0].id}`);
        return;
      }
      setCreadas(
        created.map((exc, index) => ({
          id: exc.id,
          usuario: afectados.pares[index]?.usuario ?? exc.solicitante_email,
          pc: afectados.pares[index]?.pc ?? exc.activo_afectado,
        }))
      );
    } catch (err) {
      void refresh();
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la excepción"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (creadas && creadas.length > 1) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {creadas.length} excepciones creadas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Misma justificación, fechas y aprobación. Cada usuario tiene su
            excepción y su ID.
          </p>
        </div>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {creadas.map((item) => (
            <li key={item.id}>
              <Link
                href={`/excepciones/${item.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-muted/50"
              >
                <span className="font-medium">{item.id}</span>
                <span className="text-muted-foreground">
                  {item.usuario} · {item.pc}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Button type="button" onClick={() => router.push("/excepciones")}>
          Ir al listado
        </Button>
      </div>
    );
  }

  const filasConDatos = pares.filter(
    (p) => p.usuario.trim() || p.pc.trim()
  ).length;

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
        title="Usuarios y equipos"
        description="Una fila por usuario y su PC. Si hay varias, se crea una excepción distinta por fila, con la misma justificación y fechas."
        accent="bg-sky-500/10 text-sky-700 dark:text-sky-300"
      >
        <Field className="sm:col-span-2">
          <div className="space-y-2">
            {pares.map((par, index) => (
              <div
                key={par.key}
                className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
              >
                <div className="space-y-1">
                  {index === 0 ? (
                    <Label
                      htmlFor={`usuario-${par.key}`}
                      className="flex items-center gap-1.5"
                    >
                      <User className="size-3.5 text-muted-foreground" />
                      Usuario afectado
                    </Label>
                  ) : (
                    <span className="sr-only">Usuario {index + 1}</span>
                  )}
                  <Input
                    id={`usuario-${par.key}`}
                    value={par.usuario}
                    onChange={(e) =>
                      setPares((rows) =>
                        rows.map((row) =>
                          row.key === par.key
                            ? { ...row, usuario: e.target.value }
                            : row
                        )
                      )
                    }
                    placeholder="usuario@empresa.com"
                    className={cn(
                      "h-11",
                      par.usuario.trim() && "border-sky-500/40 bg-sky-500/5"
                    )}
                    aria-label={`Usuario ${index + 1}`}
                  />
                </div>
                <div className="space-y-1">
                  {index === 0 ? (
                    <Label
                      htmlFor={`pc-${par.key}`}
                      className="flex items-center gap-1.5"
                    >
                      <Laptop className="size-3.5 text-muted-foreground" />
                      PC / equipo
                    </Label>
                  ) : (
                    <span className="sr-only">PC {index + 1}</span>
                  )}
                  <Input
                    id={`pc-${par.key}`}
                    value={par.pc}
                    onChange={(e) =>
                      setPares((rows) =>
                        rows.map((row) =>
                          row.key === par.key
                            ? { ...row, pc: e.target.value }
                            : row
                        )
                      )
                    }
                    placeholder="Hostname del PC"
                    className={cn(
                      "h-11",
                      par.pc.trim() && "border-sky-500/40 bg-sky-500/5"
                    )}
                    aria-label={`PC del usuario ${index + 1}`}
                  />
                </div>
                <div className={cn(index === 0 && "sm:pt-7")}>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    disabled={pares.length === 1}
                    onClick={() =>
                      setPares((rows) => rows.filter((row) => row.key !== par.key))
                    }
                    aria-label={`Quitar usuario ${index + 1}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => setPares((rows) => [...rows, nuevoPar()])}
          >
            <Plus className="size-4" />
            Añadir usuario
          </Button>
          <p className="text-xs text-muted-foreground">
            {filasConDatos > 1
              ? `Se crearán ${filasConDatos} excepciones, cada una con su ID y solo el usuario y el PC de su fila.`
              : "El usuario es el titular del PC. Quien abre el ticket, si es otra persona, va en «Solicitado por»."}
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
            value={manualSujetos}
            onChange={setManualSujetos}
            soloOtro
            hint={
              filasConDatos > 1
                ? "Estos vínculos extra se copian en cada excepción. El usuario y su PC van solo en la suya."
                : "El usuario y el PC se vinculan solos desde la fila de arriba. Aquí solo añades vínculos «Otro» (ticket, ubicación…)."
            }
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
          {filasConDatos > 1
            ? `${filasConDatos} excepciones`
            : "1 excepción"}
          {manualSujetos.length > 0
            ? ` · ${manualSujetos.length} vínculo${manualSujetos.length === 1 ? "" : "s"} extra`
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
            {submitting
              ? "Guardando…"
              : filasConDatos > 1
                ? `Crear ${filasConDatos} excepciones`
                : "Guardar excepción"}
          </Button>
        </div>
      </div>
    </form>
  );
}
