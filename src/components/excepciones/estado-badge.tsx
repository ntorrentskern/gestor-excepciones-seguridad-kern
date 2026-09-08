import { Badge } from "@/components/ui/badge";
import type { EstadoExcepcion, TipoEventoAuditoria } from "@/types/excepcion";
import { cn } from "@/lib/utils";

const estadoStyles: Record<EstadoExcepcion, string> = {
  Pendiente: "border-amber-200 bg-amber-50 text-amber-900",
  Aprobada: "border-emerald-200 bg-emerald-50 text-emerald-900",
  Rechazada: "border-rose-200 bg-rose-50 text-rose-900",
  Cancelada: "border-violet-200 bg-violet-50 text-violet-900",
  Caducada: "border-border bg-muted text-muted-foreground",
};

export function EstadoBadge({ estado }: { estado: EstadoExcepcion }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-md font-medium", estadoStyles[estado])}
    >
      {estado}
    </Badge>
  );
}

const eventoStyles: Record<TipoEventoAuditoria, string> = {
  Creada: "border-border bg-muted text-foreground",
  Aprobada: "border-emerald-200 bg-emerald-50 text-emerald-900",
  Rechazada: "border-rose-200 bg-rose-50 text-rose-900",
  Ampliada: "border-sky-200 bg-sky-50 text-sky-900",
  Cancelada: "border-violet-200 bg-violet-50 text-violet-900",
  Reactivada: "border-amber-200 bg-amber-50 text-amber-900",
  Caducada: "border-border bg-muted text-muted-foreground",
  Comentario: "border-border bg-card text-foreground",
};

export function EventoBadge({ tipo }: { tipo: TipoEventoAuditoria }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-md font-medium", eventoStyles[tipo])}
    >
      {tipo}
    </Badge>
  );
}
