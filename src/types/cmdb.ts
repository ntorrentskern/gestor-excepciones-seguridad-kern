import type { Dominio, EstadoExcepcion } from "@/types/excepcion";
import type { TipoSujeto } from "@/types/sujeto";

export type CmdbTipoFiltro = "todos" | "usuario" | "activo" | "servicio";

export type CmdbEstadoFiltro =
  | "Todos"
  | "Activas"
  | "Pendiente"
  | "Vencida";

export type CmdbRef = {
  id: string;
  tipo: TipoSujeto;
  clave: string;
  display_name: string;
};

export type CmdbMatrixRow = {
  sujeto: CmdbRef;
  /** Equipos (activos) correlacionados vía excepciones activas. */
  equipos: CmdbRef[];
  /** Servicios correlacionados vía excepciones activas. */
  servicios: CmdbRef[];
  /** Usuarios correlacionados vía excepciones activas. */
  usuarios: CmdbRef[];
  /** Dominios de las excepciones vinculadas (pestaña Servicios). */
  dominios: Dominio[];
  n_usuarios: number;
  n_equipos: number;
  activas: number;
  pendientes: number;
  caducadas: number;
  total_excepciones: number;
  /** Primera excepción activa (atajo). */
  excepcion_ejemplo_id: string | null;
};

export type CmdbCounts = {
  todos: number;
  usuario: number;
  activo: number;
  servicio: number;
};

export type CmdbListFilters = {
  tipo?: CmdbTipoFiltro;
  q?: string;
  estado?: CmdbEstadoFiltro;
  dominio?: Dominio | "Todos";
  /** Filtrar entidades que comparten excepciones con este servicio. */
  servicioId?: string;
  page?: number;
  pageSize?: number;
  is_sandbox?: boolean;
};

export type CmdbListResult = {
  rows: CmdbMatrixRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: CmdbCounts;
};

export type CmdbAutorizacion = {
  excepcion_id: string;
  dominio: Dominio;
  tipo_excepcion: string;
  estado: EstadoExcepcion;
  fecha_revision: string;
  temporalidad: string;
  usuario: CmdbRef | null;
  equipo: CmdbRef | null;
  servicios: CmdbRef[];
};

export type CmdbFicha = {
  sujeto: CmdbRef & { notas: string };
  metrics: {
    total: number;
    activas: number;
    pendientes: number;
    revisionProximas: number;
  };
  autorizaciones: CmdbAutorizacion[];
  impactoServicios: CmdbRef[];
  impactoEquipos: CmdbRef[];
  impactoUsuarios: CmdbRef[];
};

/** Ruta canónica de ficha CMDB. */
export function cmdbPath(ref: Pick<CmdbRef, "id" | "tipo">): string {
  if (!ref.id) return "/cmdb";
  return `/cmdb/${ref.tipo}/${ref.id}`;
}
