export const TIPOS_EXCEPCION = [
  "Dispositivo USB",
  "Acceso herramientas IA",
  "Instalación de software",
  "Acceso privilegiado",
  "Exclusión de EDR / Antivirus",
  "Acceso web excepcional",
  "Configuración técnica excepcional",
  "Otra",
] as const;

/** Etiquetas cortas para gráficos y resúmenes. */
export const TIPOS_EXCEPCION_CORTO: Record<
  (typeof TIPOS_EXCEPCION)[number],
  string
> = {
  "Dispositivo USB": "USB",
  "Acceso herramientas IA": "Uso IA",
  "Instalación de software": "Software",
  "Acceso privilegiado": "Privilegiado",
  "Exclusión de EDR / Antivirus": "EDR",
  "Acceso web excepcional": "Acceso web",
  "Configuración técnica excepcional": "Config. técnica",
  Otra: "Otra",
};

export const ESTADOS_EXCEPCION = [
  "Pendiente",
  "Aprobada",
  "Rechazada",
  "Cancelada",
  "Caducada",
] as const;

/** Estados que se pueden elegir a mano (Caducada es automática por fecha). */
export const ESTADOS_MANUALES = [
  "Pendiente",
  "Aprobada",
  "Rechazada",
  "Cancelada",
] as const;

export const TEMPORALIDADES = ["Temporal", "Permanente"] as const;

export const ORIGENES_SOLICITUD = ["Correo", "Jira", "Teams", "Otro"] as const;

export const APROBADORES_PREDEFINIDOS = [
  "ntorrents_sirt@kernpharma.com",
  "jcrodriguez_sirt@kernpharma.com",
  "fruiz@grupoindukern.com",
] as const;

/** Valor interno del selector cuando el usuario elige escribir otro. */
export const APROBADOR_OTRA_OPCION = "__otra__";

export const TIPOS_EVENTO_AUDITORIA = [
  "Creada",
  "Aprobada",
  "Rechazada",
  "Ampliada",
  "Cancelada",
  "Reactivada",
  "Caducada",
  "Editada",
  "Comentario",
] as const;

export type TipoExcepcion = (typeof TIPOS_EXCEPCION)[number];
export type EstadoExcepcion = (typeof ESTADOS_EXCEPCION)[number];
export type Temporalidad = (typeof TEMPORALIDADES)[number];
export type OrigenSolicitud = (typeof ORIGENES_SOLICITUD)[number];
export type AprobadorPredefinido = (typeof APROBADORES_PREDEFINIDOS)[number];
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
  /** Canal de entrada de la solicitud */
  origen_solicitud: OrigenSolicitud;
  /** Obligatorio si origen_solicitud === "Jira" */
  jira_ticket_id: string | null;
  solicitante_email: string;
  activo_afectado: string;
  justificacion: string;
  estado: EstadoExcepcion;
  temporalidad: Temporalidad;
  fecha_solicitud: string;
  fecha_revision: string;
  /** Quien registra / decide (auditoría). */
  aprobador_email: string | null;
  fecha_decision: string | null;
  control_compensatorio?: string;
  historial: EventoAuditoria[];
}

export type NuevaExcepcionInput = {
  tipo_excepcion: TipoExcepcion;
  origen_solicitud: OrigenSolicitud;
  jira_ticket_id?: string | null;
  solicitante_email: string;
  activo_afectado: string;
  justificacion: string;
  control_compensatorio?: string;
  estado?: EstadoExcepcion;
  temporalidad: Temporalidad;
  fecha_revision: string;
  /** Obligatorio: quien registra la excepción. */
  aprobador_email: string;
};

export type EditarExcepcionInput = {
  tipo_excepcion: TipoExcepcion;
  origen_solicitud: OrigenSolicitud;
  jira_ticket_id?: string | null;
  solicitante_email: string;
  activo_afectado: string;
  justificacion: string;
  control_compensatorio?: string;
  estado: EstadoExcepcion;
  temporalidad: Temporalidad;
  fecha_revision: string;
  actorEmail: string;
  motivo?: string;
};

export interface ExcepcionFilters {
  estado?: EstadoExcepcion | "Todos";
  tipo_excepcion?: TipoExcepcion | "Todos";
  busqueda?: string;
}

/** Por defecto en formularios hasta que el usuario elija otro. */
export const ACTOR_OTS_ACTUAL = APROBADORES_PREDEFINIDOS[0];
