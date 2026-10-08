import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import type {
  GlobalSearchResult,
  Sujeto,
  SujetoConStats,
  SujetoInput,
  TipoSujeto,
} from "@/types/sujeto";
import { normalizeTipoSujeto } from "@/types/sujeto";
import type { Dominio, EstadoExcepcion, Excepcion } from "@/types/excepcion";

type SujetoRow = {
  id: string;
  tipo: string;
  clave: string;
  display_name: string;
  notas: string;
  is_sandbox?: boolean;
  created_at?: string | Date;
  updated_at?: string | Date;
};

function normalizeClave(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function mapSujeto(row: SujetoRow): Sujeto {
  return {
    id: row.id,
    tipo: normalizeTipoSujeto(row.tipo),
    clave: row.clave,
    display_name: row.display_name || row.clave,
    notas: row.notas ?? "",
    is_sandbox: Boolean(row.is_sandbox),
  };
}

function newSujetoId(): string {
  return `suj-${randomBytes(5).toString("hex")}`;
}

/** Busca o crea un sujeto por tipo+clave (y modo sandbox si se indica). */
export async function findOrCreateSujeto(input: SujetoInput): Promise<Sujeto> {
  const tipo = normalizeTipoSujeto(input.tipo);
  const clave = normalizeClave(input.clave);
  if (!clave) throw new Error("La clave del sujeto no puede estar vacía.");

  const display = (input.display_name?.trim() || input.clave.trim()).slice(0, 200);
  const notas = input.notas?.trim() ?? "";
  const isSandbox = Boolean(input.is_sandbox);

  const existing = (await sql`
    SELECT id, tipo, clave, display_name, notas, is_sandbox
    FROM sujetos
    WHERE tipo = ${tipo}
      AND lower(clave) = ${clave}
      AND is_sandbox = ${isSandbox}
    LIMIT 1
  `) as SujetoRow[];

  if (existing[0]) {
    return mapSujeto(existing[0]);
  }

  const id = newSujetoId();
  await sql`
    INSERT INTO sujetos (id, tipo, clave, display_name, notas, is_sandbox)
    VALUES (${id}, ${tipo}, ${clave}, ${display}, ${notas}, ${isSandbox})
  `;

  return {
    id,
    tipo,
    clave,
    display_name: display,
    notas,
    is_sandbox: isSandbox,
  };
}

export async function listSujetosByExcepcion(
  excepcionId: string
): Promise<Sujeto[]> {
  const rows = (await sql`
    SELECT s.id, s.tipo, s.clave, s.display_name, s.notas, s.is_sandbox
    FROM sujetos s
    INNER JOIN excepcion_sujeto es ON es.sujeto_id = s.id
    WHERE es.excepcion_id = ${excepcionId}
    ORDER BY s.tipo ASC, s.display_name ASC
  `) as SujetoRow[];
  return rows.map(mapSujeto);
}

export async function setSujetosForExcepcion(
  excepcionId: string,
  inputs: SujetoInput[]
): Promise<Sujeto[]> {
  const sujetos: Sujeto[] = [];
  const seen = new Set<string>();

  for (const input of inputs) {
    const sujeto = await findOrCreateSujeto(input);
    const key = `${sujeto.tipo}:${sujeto.clave}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sujetos.push(sujeto);
  }

  await sql`DELETE FROM excepcion_sujeto WHERE excepcion_id = ${excepcionId}`;

  for (const s of sujetos) {
    await sql`
      INSERT INTO excepcion_sujeto (excepcion_id, sujeto_id, rol_vinculo)
      VALUES (${excepcionId}, ${s.id}, ${"afectado"})
    `;
  }

  return sujetos;
}

export async function getSujetoById(id: string): Promise<Sujeto | null> {
  const rows = (await sql`
    SELECT id, tipo, clave, display_name, notas, is_sandbox
    FROM sujetos
    WHERE id = ${id}
    LIMIT 1
  `) as SujetoRow[];
  return rows[0] ? mapSujeto(rows[0]) : null;
}

export async function searchSujetos(
  query: string,
  limit = 20,
  isSandbox = false
): Promise<SujetoConStats[]> {
  const q = normalizeClave(query);
  if (!q) return [];

  const pattern = `%${q}%`;
  const rows = (await sql`
    SELECT
      s.id, s.tipo, s.clave, s.display_name, s.notas, s.is_sandbox,
      count(e.id)::int AS total_excepciones,
      count(*) FILTER (
        WHERE e.estado IN ('Pendiente', 'Aprobada')
      )::int AS activas,
      count(*) FILTER (WHERE e.estado = 'Pendiente')::int AS pendientes
    FROM sujetos s
    LEFT JOIN excepcion_sujeto es ON es.sujeto_id = s.id
    LEFT JOIN excepciones e ON e.id = es.excepcion_id AND e.is_sandbox = ${isSandbox}
    WHERE s.is_sandbox = ${isSandbox}
      AND (
        lower(s.clave) LIKE ${pattern}
        OR lower(s.display_name) LIKE ${pattern}
        OR lower(s.notas) LIKE ${pattern}
      )
    GROUP BY s.id, s.tipo, s.clave, s.display_name, s.notas, s.is_sandbox
    ORDER BY activas DESC, total_excepciones DESC, s.display_name ASC
    LIMIT ${limit}
  `) as Array<
    SujetoRow & {
      total_excepciones: number;
      activas: number;
      pendientes: number;
    }
  >;

  return rows.map((row) => ({
    ...mapSujeto(row),
    total_excepciones: Number(row.total_excepciones) || 0,
    activas: Number(row.activas) || 0,
    pendientes: Number(row.pendientes) || 0,
  }));
}

export type ExcepcionResumenSujeto = {
  id: string;
  dominio: Dominio;
  tipo_excepcion: string;
  estado: EstadoExcepcion;
  solicitante_email: string;
  activo_afectado: string;
  fecha_solicitud: string;
  fecha_revision: string;
  temporalidad: string;
};

function toDateString(value: string | Date | null | undefined): string {
  if (value == null) return "";
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

export async function listExcepcionesBySujeto(
  sujetoId: string
): Promise<ExcepcionResumenSujeto[]> {
  const rows = (await sql`
    SELECT
      e.id, e.dominio, e.tipo_excepcion, e.estado,
      e.solicitante_email, e.activo_afectado,
      e.fecha_solicitud, e.fecha_revision, e.temporalidad
    FROM excepciones e
    INNER JOIN excepcion_sujeto es ON es.excepcion_id = e.id
    WHERE es.sujeto_id = ${sujetoId}
    ORDER BY
      CASE e.estado
        WHEN 'Pendiente' THEN 0
        WHEN 'Aprobada' THEN 1
        WHEN 'Caducada' THEN 2
        ELSE 3
      END,
      e.fecha_revision ASC,
      e.id ASC
  `) as Array<{
    id: string;
    dominio: string;
    tipo_excepcion: string;
    estado: string;
    solicitante_email: string;
    activo_afectado: string;
    fecha_solicitud: string | Date;
    fecha_revision: string | Date;
    temporalidad: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    dominio: r.dominio as Dominio,
    tipo_excepcion: r.tipo_excepcion,
    estado: r.estado as EstadoExcepcion,
    solicitante_email: r.solicitante_email,
    activo_afectado: r.activo_afectado,
    fecha_solicitud: toDateString(r.fecha_solicitud),
    fecha_revision: toDateString(r.fecha_revision),
    temporalidad: r.temporalidad,
  }));
}

/** Otros sujetos que aparecen juntos en las mismas excepciones. */
export async function listSujetosRelacionados(
  sujetoId: string,
  limit = 12
): Promise<SujetoConStats[]> {
  const rows = (await sql`
    WITH mis_exc AS (
      SELECT excepcion_id FROM excepcion_sujeto WHERE sujeto_id = ${sujetoId}
    )
    SELECT
      s.id, s.tipo, s.clave, s.display_name, s.notas, s.is_sandbox,
      count(DISTINCT es.excepcion_id)::int AS total_excepciones,
      count(DISTINCT es.excepcion_id) FILTER (
        WHERE e.estado IN ('Pendiente', 'Aprobada')
      )::int AS activas,
      count(DISTINCT es.excepcion_id) FILTER (
        WHERE e.estado = 'Pendiente'
      )::int AS pendientes
    FROM excepcion_sujeto es
    INNER JOIN mis_exc ON mis_exc.excepcion_id = es.excepcion_id
    INNER JOIN sujetos s ON s.id = es.sujeto_id
    LEFT JOIN excepciones e ON e.id = es.excepcion_id
    WHERE es.sujeto_id <> ${sujetoId}
    GROUP BY s.id, s.tipo, s.clave, s.display_name, s.notas, s.is_sandbox
    ORDER BY total_excepciones DESC, s.display_name ASC
    LIMIT ${limit}
  `) as Array<
    SujetoRow & {
      total_excepciones: number;
      activas: number;
      pendientes: number;
    }
  >;

  return rows.map((row) => ({
    ...mapSujeto(row),
    total_excepciones: Number(row.total_excepciones) || 0,
    activas: Number(row.activas) || 0,
    pendientes: Number(row.pendientes) || 0,
  }));
}

export async function globalSearch(
  query: string,
  isSandbox = false
): Promise<GlobalSearchResult> {
  const q = query.trim();
  const sujetos = await searchSujetos(q, 15, isSandbox);

  const pattern = `%${normalizeClave(q)}%`;
  const excepciones = q
    ? ((await sql`
        SELECT id, dominio, tipo_excepcion, estado, solicitante_email, activo_afectado
        FROM excepciones
        WHERE is_sandbox = ${isSandbox}
          AND (
            lower(id) LIKE ${pattern}
            OR lower(solicitante_email) LIKE ${pattern}
            OR lower(activo_afectado) LIKE ${pattern}
            OR lower(justificacion) LIKE ${pattern}
            OR lower(coalesce(jira_ticket_id, '')) LIKE ${pattern}
          )
        ORDER BY
          CASE estado
            WHEN 'Pendiente' THEN 0
            WHEN 'Aprobada' THEN 1
            WHEN 'Caducada' THEN 2
            ELSE 3
          END,
          id ASC
        LIMIT 15
      `) as Array<{
        id: string;
        dominio: string;
        tipo_excepcion: string;
        estado: string;
        solicitante_email: string;
        activo_afectado: string;
      }>)
    : [];

  return {
    query: q,
    sujetos,
    excepciones,
  };
}

export async function attachSujetosToExcepciones(
  items: Excepcion[]
): Promise<Array<Excepcion & { sujetos: Sujeto[] }>> {
  if (items.length === 0) return [];
  const ids = items.map((i) => i.id);
  const rows = (await sql`
    SELECT es.excepcion_id, s.id, s.tipo, s.clave, s.display_name, s.notas, s.is_sandbox
    FROM excepcion_sujeto es
    INNER JOIN sujetos s ON s.id = es.sujeto_id
    WHERE es.excepcion_id = ANY(${ids})
    ORDER BY s.tipo ASC, s.display_name ASC
  `) as Array<SujetoRow & { excepcion_id: string }>;

  const map = new Map<string, Sujeto[]>();
  for (const row of rows) {
    const list = map.get(row.excepcion_id) ?? [];
    list.push(mapSujeto(row));
    map.set(row.excepcion_id, list);
  }

  return items.map((item) => ({
    ...item,
    sujetos: map.get(item.id) ?? [],
  }));
}

/** Sugiere tipo a partir de texto libre (útil en formularios). */
export function suggestTipoSujeto(clave: string): TipoSujeto {
  const v = clave.trim().toLowerCase();
  if (!v) return "otro";
  if (v.includes("@")) return "usuario";
  return "activo";
}
