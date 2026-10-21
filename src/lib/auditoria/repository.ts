import { sql } from "@/lib/db";
import type {
  Dominio,
  TipoEventoAuditoria,
} from "@/types/excepcion";
import { TIPOS_EVENTO_AUDITORIA } from "@/types/excepcion";

export type AuditoriaEventoRow = {
  id: string;
  excepcion_id: string;
  tipo: TipoEventoAuditoria;
  actor_email: string;
  timestamp: string;
  detalle: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  dominio: Dominio;
  tipo_excepcion: string;
  solicitante_email: string;
};

export type AuditoriaFilters = {
  tipo?: TipoEventoAuditoria | "Todos";
  dominio?: Dominio | "Todos";
  busqueda?: string;
  is_sandbox?: boolean;
  limit?: number;
  offset?: number;
};

function isTipoEvento(v: string): v is TipoEventoAuditoria {
  return (TIPOS_EVENTO_AUDITORIA as readonly string[]).includes(v);
}

export async function listAuditoriaGlobal(
  filters: AuditoriaFilters = {}
): Promise<{ items: AuditoriaEventoRow[]; total: number }> {
  const isSandbox = Boolean(filters.is_sandbox);
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  const offset = Math.max(filters.offset ?? 0, 0);
  const tipo =
    filters.tipo && filters.tipo !== "Todos" ? filters.tipo : null;
  const dominio =
    filters.dominio && filters.dominio !== "Todos" ? filters.dominio : null;
  const q = filters.busqueda?.trim().toLowerCase() ?? "";
  const pattern = q ? `%${q}%` : null;

  const countRows = (await sql`
    SELECT count(*)::int AS n
    FROM eventos_auditoria a
    INNER JOIN excepciones e ON e.id = a.excepcion_id
    WHERE e.is_sandbox = ${isSandbox}
      AND (${tipo}::text IS NULL OR a.tipo = ${tipo})
      AND (${dominio}::text IS NULL OR e.dominio = ${dominio})
      AND (
        ${pattern}::text IS NULL
        OR lower(a.actor_email) LIKE ${pattern}
        OR lower(a.detalle) LIKE ${pattern}
        OR lower(a.excepcion_id) LIKE ${pattern}
        OR lower(e.solicitante_email) LIKE ${pattern}
      )
  `) as Array<{ n: number }>;

  const rows = (await sql`
    SELECT
      a.id, a.excepcion_id, a.tipo, a.actor_email,
      a."timestamp", a.detalle, a.estado_anterior, a.estado_nuevo,
      e.dominio, e.tipo_excepcion, e.solicitante_email
    FROM eventos_auditoria a
    INNER JOIN excepciones e ON e.id = a.excepcion_id
    WHERE e.is_sandbox = ${isSandbox}
      AND (${tipo}::text IS NULL OR a.tipo = ${tipo})
      AND (${dominio}::text IS NULL OR e.dominio = ${dominio})
      AND (
        ${pattern}::text IS NULL
        OR lower(a.actor_email) LIKE ${pattern}
        OR lower(a.detalle) LIKE ${pattern}
        OR lower(a.excepcion_id) LIKE ${pattern}
        OR lower(e.solicitante_email) LIKE ${pattern}
      )
    ORDER BY a."timestamp" DESC
    LIMIT ${limit} OFFSET ${offset}
  `) as Array<{
    id: string;
    excepcion_id: string;
    tipo: string;
    actor_email: string;
    timestamp: string | Date;
    detalle: string;
    estado_anterior: string | null;
    estado_nuevo: string | null;
    dominio: string;
    tipo_excepcion: string;
    solicitante_email: string;
  }>;

  return {
    total: Number(countRows[0]?.n) || 0,
    items: rows.map((r) => ({
      id: r.id,
      excepcion_id: r.excepcion_id,
      tipo: isTipoEvento(r.tipo) ? r.tipo : "Comentario",
      actor_email: r.actor_email,
      timestamp:
        r.timestamp instanceof Date
          ? r.timestamp.toISOString()
          : String(r.timestamp),
      detalle: r.detalle,
      estado_anterior: r.estado_anterior,
      estado_nuevo: r.estado_nuevo,
      dominio: r.dominio as Dominio,
      tipo_excepcion: r.tipo_excepcion,
      solicitante_email: r.solicitante_email,
    })),
  };
}
