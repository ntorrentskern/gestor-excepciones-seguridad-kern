import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FilePlus2,
  MessageSquare,
  Pencil,
  RotateCcw,
  ShieldOff,
  TimerOff,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { TipoEventoAuditoria } from "@/types/excepcion";

export type AuditTone =
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "violet"
  | "indigo"
  | "zinc"
  | "muted";

/** Icono / acento. */
export const AUDIT_TONE_STYLES: Record<AuditTone, string> = {
  green: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  amber: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  red: "bg-rose-500/15 text-rose-800 dark:text-rose-300",
  blue: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  violet: "bg-violet-500/15 text-violet-800 dark:text-violet-300",
  indigo: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300",
  zinc: "bg-zinc-500/15 text-zinc-800 dark:text-zinc-300",
  muted: "bg-background/60 text-muted-foreground",
};

/** Fondo suave de toda la caja del evento. */
export const AUDIT_BOX_STYLES: Record<AuditTone, string> = {
  green:
    "border-emerald-200/80 bg-emerald-50 text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-50",
  amber:
    "border-amber-200/80 bg-amber-50 text-amber-950 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-50",
  red: "border-rose-200/80 bg-rose-50 text-rose-950 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-50",
  blue: "border-sky-200/80 bg-sky-50 text-sky-950 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-50",
  violet:
    "border-violet-200/80 bg-violet-50 text-violet-950 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-50",
  indigo:
    "border-indigo-200/80 bg-indigo-50 text-indigo-950 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-50",
  zinc: "border-zinc-200/80 bg-zinc-100 text-zinc-900 dark:border-zinc-500/25 dark:bg-zinc-500/10 dark:text-zinc-50",
  muted: "border-border bg-muted/60 text-foreground",
};

/** @deprecated usar AUDIT_BOX_STYLES */
export const AUDIT_BORDER_STYLES = AUDIT_BOX_STYLES;

export function metaEventoAuditoria(tipo: TipoEventoAuditoria): {
  tone: AuditTone;
  icon: LucideIcon;
  titlePrefix: string;
} {
  switch (tipo) {
    case "Creada":
      return { tone: "blue", icon: FilePlus2, titlePrefix: "Crear" };
    case "Aprobada":
      return { tone: "green", icon: CheckCircle2, titlePrefix: "Aprobar" };
    case "Rechazada":
      return { tone: "red", icon: XCircle, titlePrefix: "Rechazar" };
    case "Cancelada":
      return { tone: "violet", icon: ShieldOff, titlePrefix: "Cerrar" };
    case "Ampliada":
      return { tone: "amber", icon: CalendarClock, titlePrefix: "Ampliar" };
    case "Reactivada":
      return { tone: "green", icon: RotateCcw, titlePrefix: "Reactivar" };
    case "Caducada":
      return { tone: "zinc", icon: TimerOff, titlePrefix: "Caducar" };
    case "Editada":
      return { tone: "indigo", icon: Pencil, titlePrefix: "Editar" };
    case "Comentario":
      return { tone: "muted", icon: MessageSquare, titlePrefix: "Comentario" };
    default:
      return { tone: "blue", icon: AlertTriangle, titlePrefix: tipo };
  }
}
