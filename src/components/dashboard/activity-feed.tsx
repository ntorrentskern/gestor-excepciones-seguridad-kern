"use client";

import {
  AlertTriangle,
  CheckCircle2,
  FilePlus2,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "green" | "amber" | "red" | "blue";

interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  tone: Tone;
  icon: LucideIcon;
}

const ACTIVIDAD_SIMULADA: ActivityItem[] = [
  {
    id: "act-1",
    title: "Excepción EXC-2026-002 aprobada por OTS",
    detail: "laura.ots@empresa.com · exclusión EDR WS-FIN-045",
    time: "Hace 12 min",
    tone: "green",
    icon: CheckCircle2,
  },
  {
    id: "act-2",
    title: "Alerta: 3 excepciones de EDR caducan esta semana",
    detail: "Revisión programada antes del viernes 17:00",
    time: "Hace 45 min",
    tone: "amber",
    icon: AlertTriangle,
  },
  {
    id: "act-3",
    title: "Petición recibida vía webhook Jira",
    detail: "SEC-1842 → EXC-2026-011 (Proxy / RH)",
    time: "Hace 1 h",
    tone: "blue",
    icon: Webhook,
  },
  {
    id: "act-4",
    title: "Excepción EXC-2026-006 rechazada",
    detail: "Motivo: usar API Gateway corporativo",
    time: "Hace 3 h",
    tone: "red",
    icon: AlertTriangle,
  },
  {
    id: "act-5",
    title: "Nueva petición registrada",
    detail: "Alta EXC-2026-010 · Uso IA / Atención al Cliente",
    time: "Hoy 09:18",
    tone: "green",
    icon: FilePlus2,
  },
];

const toneStyles: Record<Tone, string> = {
  green:
    "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  amber: "bg-amber-500/12 text-amber-700 dark:text-amber-400",
  red: "bg-rose-500/12 text-rose-700 dark:text-rose-400",
  blue: "bg-sky-500/12 text-sky-700 dark:text-sky-400",
};

export function ActivityFeed() {
  return (
    <Card className="h-full shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Actividad reciente del sistema</CardTitle>
        <CardDescription>
          Eventos simulados del entorno OTS (Fase 1).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {ACTIVIDAD_SIMULADA.map((item) => {
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
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.detail}
                </p>
                <p className="mt-1 text-[11px] font-medium text-muted-foreground/80">
                  {item.time}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
