"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EventoBadge } from "@/components/excepciones/estado-badge";
import { listAuditoriaAction } from "@/lib/auditoria/actions";
import type { AuditoriaEventoRow } from "@/lib/auditoria/repository";
import {
  AUDIT_BOX_STYLES,
  AUDIT_TONE_STYLES,
  metaEventoAuditoria,
} from "@/lib/auditoria/meta";
import {
  DOMINIO_LABELS,
  DOMINIOS,
  TIPOS_EVENTO_AUDITORIA,
  type Dominio,
  type TipoEventoAuditoria,
} from "@/types/excepcion";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 40;

function formatearRelativo(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), {
      addSuffix: true,
      locale: es,
    });
  } catch {
    return iso;
  }
}

export function AuditoriaPage() {
  const [items, setItems] = useState<AuditoriaEventoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoEventoAuditoria | "Todos">("Todos");
  const [dominio, setDominio] = useState<Dominio | "Todos">("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [queryApplied, setQueryApplied] = useState("");
  const [offset, setOffset] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listAuditoriaAction({
        tipo,
        dominio,
        busqueda: queryApplied || undefined,
        limit: PAGE_SIZE,
        offset,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar logs");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [tipo, dominio, queryApplied, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    setQueryApplied(busqueda.trim());
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Logs de auditoría
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Historial de cambios.
        </p>
      </div>

      <form
        onSubmit={applySearch}
        className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="min-w-[180px] flex-1 space-y-1.5">
          <Label htmlFor="audit-q">Buscar</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="audit-q"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Actor, ID, detalle…"
              className="pl-9"
            />
          </div>
        </div>
        <div className="w-full space-y-1.5 sm:w-44">
          <Label>Acción</Label>
          <Select
            value={tipo}
            onValueChange={(v) => {
              setOffset(0);
              setTipo(v as TipoEventoAuditoria | "Todos");
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todas</SelectItem>
              {TIPOS_EVENTO_AUDITORIA.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full space-y-1.5 sm:w-44">
          <Label>Dominio</Label>
          <Select
            value={dominio}
            onValueChange={(v) => {
              setOffset(0);
              setDominio(v as Dominio | "Todos");
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              {DOMINIOS.map((d) => (
                <SelectItem key={d} value={d}>
                  {DOMINIO_LABELS[d]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit">Filtrar</Button>
      </form>

      <p className="text-sm text-muted-foreground">
        {total} evento{total === 1 ? "" : "s"}
        {queryApplied ? ` · «${queryApplied}»` : ""}
      </p>

      {error ? (
        <p className="text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Cargando logs…
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          No hay eventos con estos filtros.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const meta = metaEventoAuditoria(item.tipo);
            const Icon = meta.icon;
            return (
              <li key={item.id}>
                <Link
                  href={`/excepciones/${item.excepcion_id}`}
                  className={cn(
                    "flex gap-3 rounded-xl border p-3 transition-opacity hover:opacity-90",
                    AUDIT_BOX_STYLES[meta.tone]
                  )}
                >
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      AUDIT_TONE_STYLES[meta.tone]
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <EventoBadge tipo={item.tipo} />
                      <span className="font-mono text-xs font-medium">
                        {item.excepcion_id}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {DOMINIO_LABELS[item.dominio]}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-foreground">
                      {item.detalle || meta.titlePrefix}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {item.actor_email} · {item.solicitante_email} ·{" "}
                      {item.tipo_excepcion}
                    </p>
                  </div>
                  <time className="shrink-0 text-right text-[11px] text-muted-foreground">
                    {formatearRelativo(item.timestamp)}
                  </time>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {total > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={offset === 0 || loading}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          >
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} de {total}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={offset + PAGE_SIZE >= total || loading}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
          >
            Siguiente
          </Button>
        </div>
      ) : null}
    </div>
  );
}
