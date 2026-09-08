"use client";

import {
  CalendarClock,
  CheckCircle2,
  FilePlus2,
  History,
  MessageSquare,
  RotateCcw,
  ShieldOff,
  TimerOff,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EventoBadge } from "@/components/excepciones/estado-badge";
import {
  formatearFecha,
  formatearFechaHora,
} from "@/lib/excepciones/utils";
import type { EventoAuditoria, TipoEventoAuditoria } from "@/types/excepcion";
import { cn } from "@/lib/utils";
import { parseISO, format } from "date-fns";

const iconByTipo: Record<TipoEventoAuditoria, LucideIcon> = {
  Creada: FilePlus2,
  Aprobada: CheckCircle2,
  Rechazada: XCircle,
  Ampliada: CalendarClock,
  Cancelada: ShieldOff,
  Reactivada: RotateCcw,
  Caducada: TimerOff,
  Comentario: MessageSquare,
};

const toneByTipo: Record<TipoEventoAuditoria, string> = {
  Creada: "bg-sky-500/15 text-sky-700 ring-sky-500/25 dark:text-sky-300",
  Aprobada:
    "bg-emerald-500/15 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
  Rechazada: "bg-rose-500/15 text-rose-700 ring-rose-500/25 dark:text-rose-300",
  Ampliada: "bg-blue-500/15 text-blue-700 ring-blue-500/25 dark:text-blue-300",
  Cancelada:
    "bg-violet-500/15 text-violet-700 ring-violet-500/25 dark:text-violet-300",
  Reactivada:
    "bg-amber-500/15 text-amber-700 ring-amber-500/25 dark:text-amber-300",
  Caducada:
    "bg-zinc-500/15 text-zinc-700 ring-zinc-500/25 dark:text-zinc-300",
  Comentario:
    "bg-muted text-muted-foreground ring-border",
};

function splitFechaHora(iso: string): { fecha: string; hora: string } {
  try {
    const d = parseISO(iso);
    return {
      fecha: format(d, "dd/MM/yyyy"),
      hora: format(d, "HH:mm"),
    };
  } catch {
    return { fecha: formatearFecha(iso.slice(0, 10)), hora: "—" };
  }
}

export function AuditTimeline({ historial }: { historial: EventoAuditoria[] }) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="size-4 text-primary" aria-hidden />
          <CardTitle className="text-base">Historial de auditoría</CardTitle>
        </div>
        <CardDescription>
          Línea de tiempo de altas, decisiones, ampliaciones, cancelaciones y
          reactivaciones.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {historial.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin eventos registrados.
          </p>
        ) : (
          <ol className="relative ml-3 border-l border-border pl-8">
            {historial.map((evento, index) => {
              const Icon = iconByTipo[evento.tipo];
              const { fecha, hora } = splitFechaHora(evento.timestamp);

              return (
                <li key={evento.id} className="relative pb-8 last:pb-0">
                  <span
                    className={cn(
                      "absolute -left-[2.55rem] top-0 flex size-9 items-center justify-center rounded-full ring-4 ring-background",
                      toneByTipo[evento.tipo]
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>

                  <div className="rounded-xl border border-border/80 bg-card p-3 shadow-none">
                    <div className="flex flex-wrap items-center gap-2">
                      <EventoBadge tipo={evento.tipo} />
                      <span className="text-xs font-medium text-muted-foreground">
                        {fecha} · {hora}
                      </span>
                      {index === 0 ? (
                        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Último
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-foreground">
                      {evento.detalle}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Usuario:{" "}
                      <span className="font-medium text-foreground">
                        {evento.actor_email}
                      </span>
                      {evento.estado_anterior || evento.estado_nuevo
                        ? ` · ${evento.estado_anterior ?? "—"} → ${evento.estado_nuevo ?? "—"}`
                        : null}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/80">
                      {formatearFechaHora(evento.timestamp)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
