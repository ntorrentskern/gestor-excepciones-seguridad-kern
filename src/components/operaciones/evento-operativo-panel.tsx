"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  CheckCircle2,
  ClipboardList,
  Laptop,
  User,
  UserMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  reasignarExcepcionOperacionAction,
  reasignarTodasOperacionAction,
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
          cambio de dispositivo. En el detalle podrás reasignar usuario/PC.
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
  const [bulkUsuario, setBulkUsuario] = useState("");
  const [bulkActivo, setBulkActivo] = useState("");
  const [rowDrafts, setRowDrafts] = useState<
    Record<string, { usuario: string; activo: string }>
  >({});

  async function refresh() {
    const next = await getEventoOperativoAction(id);
    setData(next);
    if (next) {
      setRowDrafts((prev) => {
        const nextDrafts = { ...prev };
        for (const e of next.excepciones) {
          if (!nextDrafts[e.id]) {
            nextDrafts[e.id] = { usuario: "", activo: "" };
          }
        }
        return nextDrafts;
      });
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getEventoOperativoAction(id)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          if (d) {
            const drafts: Record<string, { usuario: string; activo: string }> =
              {};
            for (const e of d.excepciones) {
              drafts[e.id] = { usuario: "", activo: "" };
            }
            setRowDrafts(drafts);
          }
        }
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

  async function reasignarUna(excepcionId: string) {
    const draft = rowDrafts[excepcionId];
    if (!draft?.usuario.trim() && !draft?.activo.trim()) {
      setError("Indica nuevo usuario y/o nuevo PC en esa fila.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await reasignarExcepcionOperacionAction({
        eventoId: id,
        excepcionId,
        nuevoUsuario: draft.usuario.trim() || undefined,
        nuevoActivo: draft.activo.trim() || undefined,
      });
      setData(updated);
      setRowDrafts((prev) => ({
        ...prev,
        [excepcionId]: { usuario: "", activo: "" },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reasignar");
    } finally {
      setBusy(false);
    }
  }

  async function reasignarTodas() {
    if (!bulkUsuario.trim() && !bulkActivo.trim()) {
      setError("Indica nuevo usuario y/o nuevo PC para aplicar a todas.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await reasignarTodasOperacionAction({
        eventoId: id,
        nuevoUsuario: bulkUsuario.trim() || undefined,
        nuevoActivo: bulkActivo.trim() || undefined,
      });
      setData(updated);
      setBulkUsuario("");
      setBulkActivo("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reasignar");
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
      <p className="text-sm text-muted-foreground">Evento no encontrado.</p>
    );
  }

  const pendientes = data.excepciones.filter((e) => !e.revisada).length;
  const esBaja = data.tipo === "BajaUsuario";
  const esCambio = data.tipo === "CambioDispositivo";

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

      {data.estado === "Abierto" && data.excepciones.length > 0 ? (
        <Card className="shadow-none border-sky-500/25 bg-sky-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowRightLeft className="size-4" />
              Reasignación rápida
            </CardTitle>
            <CardDescription>
              {esBaja
                ? "Asigna un nuevo titular (y/o PC) a las excepciones que se mantienen. Luego marca cada una como revisada."
                : null}
              {esCambio
                ? "Asigna el nuevo PC a las excepciones que se mantienen. Luego marca cada una como revisada."
                : null}
              {!esBaja && !esCambio
                ? "Actualiza usuario y/o PC sin cerrar el checklist."
                : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <User className="size-3.5" />
                Nuevo usuario
              </Label>
              <Input
                value={bulkUsuario}
                onChange={(e) => setBulkUsuario(e.target.value)}
                placeholder={
                  esBaja
                    ? "Quien hereda las excepciones…"
                    : "Opcional · titular"
                }
                className="h-10"
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Laptop className="size-3.5" />
                Nuevo PC / activo
              </Label>
              <Input
                value={bulkActivo}
                onChange={(e) => setBulkActivo(e.target.value)}
                placeholder={
                  esCambio
                    ? "Hostname del equipo nuevo…"
                    : "Opcional · equipo"
                }
                className="h-10"
                disabled={busy}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                disabled={busy}
                onClick={() => void reasignarTodas()}
                className="w-full sm:w-auto"
              >
                Aplicar a todas
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <p className="text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {data.excepciones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No había excepciones activas al crear el evento.
          </p>
        ) : (
          data.excepciones.map((e) => {
            const draft = rowDrafts[e.id] ?? { usuario: "", activo: "" };
            return (
              <div
                key={e.id}
                className="space-y-3 rounded-2xl border border-border bg-card px-4 py-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Usuario:
                      </span>{" "}
                      {e.solicitante_email || "—"}
                      <span className="mx-2">·</span>
                      <span className="font-medium text-foreground">
                        Equipo:
                      </span>{" "}
                      {e.activo_afectado || "—"}
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

                {data.estado === "Abierto" && !e.revisada ? (
                  <div className="grid gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-3 sm:grid-cols-[1fr_1fr_auto]">
                    <Input
                      value={draft.usuario}
                      onChange={(ev) =>
                        setRowDrafts((prev) => ({
                          ...prev,
                          [e.id]: {
                            ...draft,
                            usuario: ev.target.value,
                          },
                        }))
                      }
                      placeholder="Nuevo usuario…"
                      className="h-9"
                      disabled={busy}
                    />
                    <Input
                      value={draft.activo}
                      onChange={(ev) =>
                        setRowDrafts((prev) => ({
                          ...prev,
                          [e.id]: {
                            ...draft,
                            activo: ev.target.value,
                          },
                        }))
                      }
                      placeholder="Nuevo PC…"
                      className="h-9"
                      disabled={busy}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void reasignarUna(e.id)}
                    >
                      Reasignar
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })
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
