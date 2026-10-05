export {
  DOMINIOS,
  DOMINIO_LABELS,
  DOMINIO_PREFIX,
  TIPOS_EXCEPCION,
  TIPOS_EXCEPCION_CORTO,
  TIPOS_POR_DOMINIO,
  TIPOS_SEGURIDAD,
  TIPOS_SISTEMAS,
  TIPOS_HELPDESK,
  dominioDeTipo,
  esTipoValidoParaDominio,
  isDominio,
  tiposDeDominio,
  type Dominio,
  type TipoExcepcion,
} from "@/types/dominio";

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

import type { Dominio, TipoExcepcion } from "@/types/dominio";

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
  dominio: Dominio;
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
  dominio: Dominio;
  tipo_excepcion: TipoExcepcion;
  origen_solicitud: OrigenSolicitud;
  jira_ticket_id?: string | null;
  /** Titular del equipo afectado (para correlación usuario ↔ PC). */
  solicitante_email: string;
  activo_afectado: string;
  justificacion: string;
  control_compensatorio?: string;
  estado?: EstadoExcepcion;
  temporalidad: Temporalidad;
  fecha_revision: string;
  /** Obligatorio: quien registra la excepción. */
  aprobador_email: string;
  /**
   * Si quien pide no es el usuario afectado (p. ej. Helpdesk),
   * se guarda como comentario y no ensucia la correlación.
   */
  solicitado_por?: string;
  /** Sujetos a vincular (usuario, PC, etc.). */
  sujetos?: import("@/types/sujeto").SujetoInput[];
};

export type EditarExcepcionInput = {
  dominio: Dominio;
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
  sujetos?: import("@/types/sujeto").SujetoInput[];
};

export interface ExcepcionFilters {
  estado?: EstadoExcepcion | "Todos";
  tipo_excepcion?: TipoExcepcion | "Todos";
  dominio?: Dominio | "Todos";
  busqueda?: string;
}

/** Por defecto en formularios hasta que el usuario elija otro. */
export const ACTOR_OTS_ACTUAL = APROBADORES_PREDEFINIDOS[0];
