export const TIPOS_EXCEPCION = [
  "Regla Firewall",
  "EDR",
  "USB",
  "Uso IA",
  "Proxy",
] as const;

export const ESTADOS_EXCEPCION = [
  "Pendiente",
  "Aprobada",
  "Rechazada",
  "Cancelada",
  "Caducada",
] as const;

export const TEMPORALIDADES = ["Temporal", "Permanente"] as const;

export const TIPOS_EVENTO_AUDITORIA = [
  "Creada",
  "Aprobada",
  "Rechazada",
  "Ampliada",
  "Cancelada",
  "Reactivada",
  "Caducada",
  "Comentario",
] as const;

export type TipoExcepcion = (typeof TIPOS_EXCEPCION)[number];
export type EstadoExcepcion = (typeof ESTADOS_EXCEPCION)[number];
export type Temporalidad = (typeof TEMPORALIDADES)[number];
export type TipoEventoAuditoria = (typeof TIPOS_EVENTO_AUDITORIA)[number];

export interface EventoAuditoria {
  id: string;
  tipo: TipoEventoAuditoria;
  actor_email: string;
  timestamp: string;
  detalle: string;
  estado_anterior?: EstadoExcepcion | null;
  estado_nuevo?: EstadoExcepcion | null;
}

export interface Excepcion {
  id: string;
  tipo_excepcion: TipoExcepcion;
  origen_peticion: string;
  solicitante_email: string;
  activo_afectado: string;
  justificacion: string;
  estado: EstadoExcepcion;
  temporalidad: Temporalidad;
  fecha_solicitud: string;
  fecha_revision: string;
  /** Quién tomó la última decisión de aprobación/rechazo */
  aprobador_email: string | null;
  fecha_decision: string | null;
  control_compensatorio?: string;
  historial: EventoAuditoria[];
}

export type NuevaExcepcionInput = Omit<
  Excepcion,
  | "id"
  | "fecha_solicitud"
  | "historial"
  | "aprobador_email"
  | "fecha_decision"
> & {
  fecha_solicitud?: string;
  aprobador_email?: string | null;
  fecha_decision?: string | null;
  historial?: EventoAuditoria[];
};

export interface ExcepcionFilters {
  estado?: EstadoExcepcion | "Todos";
  tipo_excepcion?: TipoExcepcion | "Todos";
  busqueda?: string;
}

/** Usuario OTS simulado en Fase 1 (sin auth real). */
export const ACTOR_OTS_ACTUAL = "ots.analista@empresa.com";
