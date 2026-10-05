"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Laptop,
  Search,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { listAllEventosOperativosAction } from "@/lib/operaciones/actions";
import { formatearFechaHora } from "@/lib/excepciones/utils";
import {
  TIPO_EVENTO_OPERATIVO_LABELS,
  type EventoOperativoListItem,
} from "@/types/operaciones";
import { TIPO_SUJETO_LABELS, type TipoSujeto } from "@/types/sujeto";

type FiltroEstado = "Abierto" | "Cerrado" | "Todos";

export function OperacionesListado() {
  const [estado, setEstado] = useState<FiltroEstado>("Abierto");
  const [items, setItems] = useState<EventoOperativoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void listAllEventosOperativosAction({ estado })
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [estado]);

  const resumen = useMemo(() => {
    const abiertos = items.filter((i) => i.estado === "Abierto");
    return {
      abiertos: abiertos.length,
      pendientesItems: abiertos.reduce(
        (acc, i) => acc + i.pendientes_revision,
        0
      ),
    };
  }, [items]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Operaciones</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Bajas de usuario y cambios de dispositivo en curso. Aquí vuelves
            siempre a los checklists pendientes de validar.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/buscar">
            <Search className="size-4" />
            Buscar usuario / PC
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide">
              Abiertos (filtro actual)
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {loading ? "—" : resumen.abiertos}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide">
              Excepciones por revisar
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums text-amber-700 dark:text-amber-400">
              {loading ? "—" : resumen.pendientesItems}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide">
              Cómo crear uno
            </CardDescription>
            <CardTitle className="text-sm font-medium leading-snug">
              Busca la ficha → Baja / Cambio de dispositivo
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
          <CardTitle className="text-base">Listado</CardTitle>
          <div className="w-[180px] space-y-1">
            <Label className="text-xs">Estado</Label>
            <Select
              value={estado}
              onValueChange={(v) => setEstado(v as FiltroEstado)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Abierto">Abiertos</SelectItem>
                <SelectItem value="Cerrado">Cerrados</SelectItem>
                <SelectItem value="Todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {error ? (
            <p className="text-sm text-rose-700" role="alert">
              {error}
            </p>
          ) : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <ClipboardList className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">
                No hay operaciones {estado === "Todos" ? "" : estado.toLowerCase() + "s"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Créalas desde la ficha de un usuario o PC en el buscador.
              </p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/buscar">Ir al buscador</Link>
              </Button>
            </div>
          ) : (
            items.map((item) => {
              const Icon =
                item.tipo === "BajaUsuario" ? UserMinus : Laptop;
              const tipoSujeto = item.sujeto_tipo as TipoSujeto;
              return (
                <Link
                  key={item.id}
                  href={`/operaciones/${item.id}`}
                  className="group flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">
                          {TIPO_EVENTO_OPERATIVO_LABELS[item.tipo]}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs ${
                            item.estado === "Abierto"
                              ? "bg-amber-500/10 text-amber-800 dark:text-amber-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {item.estado}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm">
                        {item.sujeto_display}
                        <span className="text-muted-foreground">
                          {" "}
                          ·{" "}
                          {TIPO_SUJETO_LABELS[tipoSujeto] ?? item.sujeto_tipo}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.id} · {item.actor_email} ·{" "}
                        {formatearFechaHora(item.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:shrink-0">
                    <div className="text-right text-xs">
                      <p className="font-medium tabular-nums">
                        {item.pendientes_revision} por revisar
                      </p>
                      <p className="text-muted-foreground tabular-nums">
                        {item.total_excepciones} en checklist
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
