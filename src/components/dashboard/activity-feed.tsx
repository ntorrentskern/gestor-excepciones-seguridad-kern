"use client";

import { useMemo } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FilePlus2,
  RotateCcw,
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
import { useExcepciones } from "@/context/excepciones-context";
import { cn } from "@/lib/utils";
import {
  TIPOS_EXCEPCION_CORTO,
  type TipoEventoAuditoria,
  type TipoExcepcion,
} from "@/types/excepcion";

type Tone = "green" | "amber" | "red" | "blue";

interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  timestamp: string;
  tone: Tone;
  icon: LucideIcon;
}

const toneStyles: Record<Tone, string> = {
  green: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  amber: "bg-amber-500/12 text-amber-700 dark:text-amber-400",
  red: "bg-rose-500/12 text-rose-700 dark:text-rose-400",
  blue: "bg-sky-500/12 text-sky-700 dark:text-sky-400",
};

function metaEvento(tipo: TipoEventoAuditoria): {
  tone: Tone;
  icon: LucideIcon;
  titlePrefix: string;
} {
  switch (tipo) {
    case "Creada":
      return { tone: "blue", icon: FilePlus2, titlePrefix: "Alta" };
    case "Aprobada":
      return { tone: "green", icon: CheckCircle2, titlePrefix: "Aprobada" };
    case "Rechazada":
      return { tone: "red", icon: XCircle, titlePrefix: "Rechazada" };
    case "Cancelada":
      return { tone: "red", icon: AlertTriangle, titlePrefix: "Cerrada" };
    case "Ampliada":
      return { tone: "amber", icon: CalendarClock, titlePrefix: "Ampliada" };
    case "Reactivada":
      return { tone: "green", icon: RotateCcw, titlePrefix: "Reactivada" };
    case "Caducada":
      return { tone: "amber", icon: AlertTriangle, titlePrefix: "Caducada" };
    case "Editada":
      return { tone: "blue", icon: FilePlus2, titlePrefix: "Editada" };
    default:
      return { tone: "blue", icon: FilePlus2, titlePrefix: tipo };
  }
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
        const meta = metaEvento(evento.tipo);
        flattened.push({
          id: evento.id,
          title: `${meta.titlePrefix} ${exc.id}`,
          detail: `${evento.actor_email} · ${tipoCorto}`,
          time: formatearRelativo(evento.timestamp),
          timestamp: evento.timestamp,
          tone: meta.tone,
          icon: meta.icon,
        });
      }
    }

    return flattened
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 8);
  }, [excepciones]);

  return (
    <Card className="h-full shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Actividad reciente del sistema</CardTitle>
        <CardDescription>
          Últimos eventos de auditoría en Neon.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
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
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="flex gap-3 rounded-xl border border-border/70 bg-muted/30 p-3"
              >
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    toneStyles[item.tone]
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {item.detail}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-muted-foreground/80">
                    {item.time}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
