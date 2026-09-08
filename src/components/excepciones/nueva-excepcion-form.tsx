"use client";

import { useState, type FormEvent } from "react";
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
import {
  ESTADOS_EXCEPCION,
  TEMPORALIDADES,
  TIPOS_EXCEPCION,
  type EstadoExcepcion,
  type Temporalidad,
  type TipoExcepcion,
} from "@/types/excepcion";

const initialForm = {
  tipo_excepcion: "" as TipoExcepcion | "",
  origen_peticion: "",
  solicitante_email: "",
  activo_afectado: "",
  justificacion: "",
  control_compensatorio: "",
  estado: "Pendiente" as EstadoExcepcion,
  temporalidad: "Temporal" as Temporalidad,
  fecha_revision: "",
};

export function NuevaExcepcionForm() {
  const router = useRouter();
  const { create } = useExcepciones();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.tipo_excepcion) {
      setError("Selecciona un tipo de excepción.");
      return;
    }
    if (!form.fecha_revision) {
      setError("Indica la fecha de revisión.");
      return;
    }

    try {
      setSubmitting(true);
      const created = await create({
        tipo_excepcion: form.tipo_excepcion,
        origen_peticion: form.origen_peticion.trim(),
        solicitante_email: form.solicitante_email.trim(),
        activo_afectado: form.activo_afectado.trim(),
        justificacion: form.justificacion.trim(),
        control_compensatorio: form.control_compensatorio.trim(),
        estado: form.estado,
        temporalidad: form.temporalidad,
        fecha_revision: form.fecha_revision,
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
          Completa los datos del alta. Se guardará en el almacén local (Fase 1).
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
            <Label htmlFor="origen">Origen de la petición</Label>
            <Input
              id="origen"
              required
              value={form.origen_peticion}
              onChange={(e) =>
                setForm((f) => ({ ...f, origen_peticion: e.target.value }))
              }
              placeholder="Ej. OTS - Infraestructura"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email del solicitante</Label>
            <Input
              id="email"
              type="email"
              required
              value={form.solicitante_email}
              onChange={(e) =>
                setForm((f) => ({ ...f, solicitante_email: e.target.value }))
              }
              placeholder="usuario@empresa.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="activo">Activo afectado</Label>
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
              onValueChange={(v) =>
                setForm((f) => ({ ...f, temporalidad: v as Temporalidad }))
              }
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
          </div>

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
