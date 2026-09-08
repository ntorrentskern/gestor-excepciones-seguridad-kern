"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useExcepciones } from "@/context/excepciones-context";
import { fechaRevisionPorDefecto } from "@/lib/excepciones/utils";
import {
  APROBADORES_PREDEFINIDOS,
  APROBADOR_OTRA_OPCION,
  ESTADOS_EXCEPCION,
  ORIGENES_SOLICITUD,
  TEMPORALIDADES,
  TIPOS_EXCEPCION,
  type EstadoExcepcion,
  type OrigenSolicitud,
  type Temporalidad,
  type TipoExcepcion,
} from "@/types/excepcion";

const initialForm = {
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
  aprobador_opcion: APROBADORES_PREDEFINIDOS[0] as string,
  aprobador_otro: "",
};

export function NuevaExcepcionForm() {
  const router = useRouter();
  const { create } = useExcepciones();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const muestraJira = form.origen_solicitud === "Jira";
  const muestraOtroAprobador = form.aprobador_opcion === APROBADOR_OTRA_OPCION;

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
        tipo_excepcion: form.tipo_excepcion,
        origen_solicitud: form.origen_solicitud,
        jira_ticket_id:
          form.origen_solicitud === "Jira" ? form.jira_ticket_id.trim() : null,
        solicitante_email: form.solicitante_email.trim(),
        activo_afectado: form.activo_afectado.trim(),
        justificacion: form.justificacion.trim(),
        control_compensatorio: form.control_compensatorio.trim(),
        estado: form.estado,
        temporalidad: form.temporalidad,
        fecha_revision: form.fecha_revision,
        aprobador_email: aprobador,
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
    <Card className="mx-auto max-w-3xl shadow-none">
      <CardHeader>
        <CardTitle className="font-semibold">
          Nueva excepción de seguridad
        </CardTitle>
        <CardDescription>
          Los datos se guardan en Neon. El aprobador queda registrado para
          auditoría.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="tipo">Tipo de excepción</Label>
            <Select
              value={form.tipo_excepcion || undefined}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, tipo_excepcion: v as TipoExcepcion }))
              }
              required
            >
              <SelectTrigger id="tipo" className="w-full">
                <SelectValue placeholder="Seleccionar tipo" />
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
            <Label htmlFor="origen">Origen de la solicitud</Label>
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
              <SelectTrigger id="origen" className="w-full">
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
          </div>

          {muestraJira ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="jira">ID ticket Jira</Label>
              <Input
                id="jira"
                required
                value={form.jira_ticket_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, jira_ticket_id: e.target.value }))
                }
                placeholder="Ej. SEC-1234"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">Solicitante</Label>
            <Input
              id="email"
              required
              value={form.solicitante_email}
              onChange={(e) =>
                setForm((f) => ({ ...f, solicitante_email: e.target.value }))
              }
              placeholder="usuario@empresa.com o nombre"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="activo">Activos afectados</Label>
            <Input
              id="activo"
              required
              value={form.activo_afectado}
              onChange={(e) =>
                setForm((f) => ({ ...f, activo_afectado: e.target.value }))
              }
              placeholder="Host, IP, usuario o servicio"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estado">Estado inicial</Label>
            <Select
              value={form.estado}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, estado: v as EstadoExcepcion }))
              }
            >
              <SelectTrigger id="estado" className="w-full">
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
          </div>

          <div className="space-y-2">
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
              <SelectTrigger id="temporalidad" className="w-full">
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
            <Label htmlFor="revision">Fecha de revisión</Label>
            <Input
              id="revision"
              type="date"
              required
              value={form.fecha_revision}
              onChange={(e) =>
                setForm((f) => ({ ...f, fecha_revision: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">{ayudaRevision}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aprobador">Aprobador</Label>
            <Select
              value={form.aprobador_opcion}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, aprobador_opcion: v }))
              }
            >
              <SelectTrigger id="aprobador" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APROBADORES_PREDEFINIDOS.map((email) => (
                  <SelectItem key={email} value={email}>
                    {email}
                  </SelectItem>
                ))}
                <SelectItem value={APROBADOR_OTRA_OPCION}>Otra opción</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {muestraOtroAprobador ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="aprobador-otro">Correo o nombre del aprobador</Label>
              <Input
                id="aprobador-otro"
                required
                value={form.aprobador_otro}
                onChange={(e) =>
                  setForm((f) => ({ ...f, aprobador_otro: e.target.value }))
                }
                placeholder="nombre@empresa.com o Nombre Apellido"
              />
            </div>
          ) : null}

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="justificacion">Justificación</Label>
            <Textarea
              id="justificacion"
              required
              rows={3}
              value={form.justificacion}
              onChange={(e) =>
                setForm((f) => ({ ...f, justificacion: e.target.value }))
              }
              placeholder="Describe el motivo de negocio…"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="control">Control compensatorio</Label>
            <Textarea
              id="control"
              rows={2}
              value={form.control_compensatorio}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  control_compensatorio: e.target.value,
                }))
              }
              placeholder="Mitigaciones: logs, allowlist, cifrado, supervisión…"
            />
          </div>

          {error ? (
            <p className="sm:col-span-2 text-sm text-rose-700" role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t border-border/70 bg-transparent">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/excepciones")}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Guardando…" : "Guardar excepción"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
