"use client";

import { useMemo } from "react";
import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EventoBadge } from "@/components/excepciones/estado-badge";
import { useExcepciones } from "@/context/excepciones-context";
import {
  AUDIT_BOX_STYLES,
  AUDIT_TONE_STYLES,
  metaEventoAuditoria,
} from "@/lib/auditoria/meta";
import { cn } from "@/lib/utils";
import {
  TIPOS_EXCEPCION_CORTO,
  type TipoEventoAuditoria,
  type TipoExcepcion,
} from "@/types/excepcion";

interface ActivityItem {
  id: string;
  excepcionId: string;
  tipo: TipoEventoAuditoria;
  detail: string;
  time: string;
  timestamp: string;
}

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

export function ActivityFeed() {
  const { excepciones, loading } = useExcepciones();

  const items = useMemo(() => {
    const flattened: ActivityItem[] = [];

    for (const exc of excepciones) {
      const tipoCorto =
        TIPOS_EXCEPCION_CORTO[exc.tipo_excepcion as TipoExcepcion] ??
        exc.tipo_excepcion;

      for (const evento of exc.historial) {
        flattened.push({
          id: evento.id,
          excepcionId: exc.id,
          tipo: evento.tipo,
          detail: `${evento.actor_email} · ${tipoCorto}`,
          time: formatearRelativo(evento.timestamp),
          timestamp: evento.timestamp,
        });
      }
    }

    return flattened
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 8);
  }, [excepciones]);

  return (
    <Card className="h-full shadow-none">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Actividad reciente</CardTitle>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/auditoria">
              Ver todos
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Cargando actividad…
          </p>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin eventos recientes.
          </p>
        ) : (
          items.map((item) => {
            const meta = metaEventoAuditoria(item.tipo);
            const Icon = meta.icon;
            return (
              <Link
                key={item.id}
                href={`/excepciones/${item.excepcionId}`}
                className={cn(
                  "flex gap-3 rounded-xl border p-2.5 transition-opacity hover:opacity-90",
                  AUDIT_BOX_STYLES[meta.tone]
                )}
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    AUDIT_TONE_STYLES[meta.tone]
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <EventoBadge tipo={item.tipo} />
                    <p className="font-mono text-xs font-medium">
                      {item.excepcionId}
                    </p>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {item.detail}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                    {item.time}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
