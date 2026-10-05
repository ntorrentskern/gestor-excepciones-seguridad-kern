"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ClipboardList,
  Laptop,
  UserMinus,
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
import {
  cerrarEventoOperativoAction,
  crearEventoOperativoAction,
  getEventoOperativoAction,
  marcarRevisadaAction,
} from "@/lib/operaciones/actions";
import {
  TIPO_EVENTO_OPERATIVO_LABELS,
  type EventoOperativoDetalle,
} from "@/types/operaciones";
import { DOMINIO_LABELS, type Dominio } from "@/types/dominio";
import type { EstadoExcepcion } from "@/types/excepcion";
import { cancelarExcepcion } from "@/lib/excepciones/actions";

export function EventoOperativoPanel({
  sujetoId,
  tipoPreferido,
}: {
  sujetoId: string;
  /** Si la ficha es usuario → BajaUsuario; si PC/dispositivo → CambioDispositivo */
  tipoPreferido: "BajaUsuario" | "CambioDispositivo";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evento, setEvento] = useState<EventoOperativoDetalle | null>(null);
  const [notas, setNotas] = useState("");

  async function crear(tipo: "BajaUsuario" | "CambioDispositivo") {
    setBusy(true);
    setError(null);
    try {
      const created = await crearEventoOperativoAction({
        tipo,
        sujetoId,
        notas,
      });
      setEvento(created);
      router.push(`/operaciones/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Evento operativo</CardTitle>
        <CardDescription>
          Genera un checklist con las excepciones activas para una baja o un
          cambio de dispositivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          className="min-h-[72px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Notas (ticket, motivo, dispositivo nuevo…)"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={tipoPreferido === "BajaUsuario" ? "default" : "outline"}
            disabled={busy}
            onClick={() => void crear("BajaUsuario")}
          >
            <UserMinus className="size-4" />
            Baja de usuario
          </Button>
          <Button
            type="button"
            variant={
              tipoPreferido === "CambioDispositivo" ? "default" : "outline"
            }
            disabled={busy}
            onClick={() => void crear("CambioDispositivo")}
          >
            <Laptop className="size-4" />
            Cambio de dispositivo
          </Button>
        </div>
        {error ? (
          <p className="text-sm text-rose-700" role="alert">
            {error}
          </p>
        ) : null}
        {evento ? (
          <p className="text-sm text-muted-foreground">
            Creado{" "}
            <Link
              href={`/operaciones/${evento.id}`}
              className="font-medium text-primary hover:underline"
            >
              {evento.id}
            </Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function EventoOperativoDetalleView({ id }: { id: string }) {
  const [data, setData] = useState<EventoOperativoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const next = await getEventoOperativoAction(id);
    setData(next);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getEventoOperativoAction(id)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function toggleRevisada(excepcionId: string, revisada: boolean) {
    setBusy(true);
    try {
      await marcarRevisadaAction({ eventoId: id, excepcionId, revisada });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function cancelarYMarcar(excepcionId: string) {
    setBusy(true);
    setError(null);
    try {
      await cancelarExcepcion(excepcionId, {
        motivo: `Cerrada desde evento operativo ${id}`,
      });
      await marcarRevisadaAction({
        eventoId: id,
        excepcionId,
        revisada: true,
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar");
    } finally {
      setBusy(false);
    }
  }

  async function cerrar() {
    setBusy(true);
    try {
      const updated = await cerrarEventoOperativoAction(id);
      setData(updated);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando evento…</p>;
  }
  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">
        Evento no encontrado.
      </p>
    );
  }

  const pendientes = data.excepciones.filter((e) => !e.revisada).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Evento operativo
        </p>
        <h2 className="text-2xl font-semibold">
          {TIPO_EVENTO_OPERATIVO_LABELS[data.tipo]}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.id} · {data.estado} · {data.actor_email}
        </p>
        {data.notas ? (
          <p className="mt-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm">
            {data.notas}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {data.excepciones.length} excepciones · {pendientes} por revisar
        </p>
        {data.estado === "Abierto" ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy || pendientes > 0}
            onClick={() => void cerrar()}
          >
            <CheckCircle2 className="size-4" />
            Cerrar evento
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        {data.excepciones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No había excepciones activas al crear el evento.
          </p>
        ) : (
          data.excepciones.map((e) => (
            <div
              key={e.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/excepciones/${e.id}`}
                    className="font-mono text-sm font-medium text-primary hover:underline"
                  >
                    {e.id}
                  </Link>
                  <EstadoBadge estado={e.estado as EstadoExcepcion} />
                  <span className="text-xs text-muted-foreground">
                    {DOMINIO_LABELS[e.dominio as Dominio] ?? e.dominio}
                  </span>
                  {e.revisada ? (
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-800 dark:text-emerald-300">
                      Revisada
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {e.tipo_excepcion}
                </p>
              </div>
              {data.estado === "Abierto" ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void toggleRevisada(e.id, !e.revisada)}
                  >
                    {e.revisada ? "Desmarcar" : "Marcar revisada"}
                  </Button>
                  {(e.estado === "Pendiente" ||
                    e.estado === "Aprobada" ||
                    e.estado === "Caducada") && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => void cancelarYMarcar(e.id)}
                    >
                      Cancelar excepción
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/operaciones">
            <ClipboardList className="size-4" />
            Todas las operaciones
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/sujetos/${data.sujeto_id}`}>Volver a la ficha</Link>
        </Button>
      </div>
    </div>
  );
}
