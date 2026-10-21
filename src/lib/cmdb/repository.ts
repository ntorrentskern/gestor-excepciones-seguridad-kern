import { sql } from "@/lib/db";
import type {
  CmdbAutorizacion,
  CmdbCounts,
  CmdbFicha,
  CmdbListFilters,
  CmdbListResult,
  CmdbMatrixRow,
  CmdbRef,
  CmdbTipoFiltro,
} from "@/types/cmdb";
import type { Dominio, EstadoExcepcion } from "@/types/excepcion";
import { normalizeTipoSujeto } from "@/types/sujeto";

const ESTADOS_ACTIVOS = ["Pendiente", "Aprobada"] as const;

function toDateString(value: string | Date | null | undefined): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function mapRef(row: {
  id: string;
  tipo: string;
  clave: string;
  display_name: string;
}): CmdbRef {
  return {
    id: row.id,
    tipo: normalizeTipoSujeto(row.tipo),
    clave: row.clave,
    display_name: row.display_name || row.clave,
  };
}

function estadosFilterSql(
  estado: CmdbListFilters["estado"]
): string[] | null {
  if (!estado || estado === "Todos") return null;
  if (estado === "Activas") return [...ESTADOS_ACTIVOS];
  if (estado === "Pendiente") return ["Pendiente"];
  if (estado === "Vencida") return ["Caducada"];
  return null;
}

function uniqRefs(items: CmdbRef[]): CmdbRef[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const key = i.id || `${i.tipo}:${i.clave}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getCmdbCounts(isSandbox = false): Promise<CmdbCounts> {
  const rows = (await sql`
    SELECT
      count(*) FILTER (WHERE tipo IN ('usuario','activo','servicio'))::int AS todos,
      count(*) FILTER (WHERE tipo = 'usuario')::int AS usuario,
      count(*) FILTER (WHERE tipo = 'activo')::int AS activo,
      count(*) FILTER (WHERE tipo = 'servicio')::int AS servicio
    FROM sujetos
    WHERE is_sandbox = ${isSandbox}
      AND tipo IN ('usuario', 'activo', 'servicio')
  `) as Array<{
    todos: number;
    usuario: number;
    activo: number;
    servicio: number;
  }>;

  const r = rows[0];
  return {
    todos: Number(r?.todos) || 0,
    usuario: Number(r?.usuario) || 0,
    activo: Number(r?.activo) || 0,
    servicio: Number(r?.servicio) || 0,
  };
}

/**
 * Inventario CMDB: correlaciones vía excepcion_sujeto (misma excepción).
 * Vista Personas → solo usuarios; Activos / Servicios → su tipo.
 */
export async function listCmdbMatrix(
  filters: CmdbListFilters = {}
): Promise<CmdbListResult> {
  const isSandbox = Boolean(filters.is_sandbox);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 100);
  const page = Math.max(filters.page ?? 1, 1);
  const offset = (page - 1) * pageSize;
  const q = filters.q?.trim().toLowerCase() ?? "";
  const pattern = q ? `%${q}%` : null;
  const tipoFiltro =
    filters.tipo && filters.tipo !== "todos" ? filters.tipo : null;
  const dominio =
    filters.dominio && filters.dominio !== "Todos" ? filters.dominio : null;
  const estados = estadosFilterSql(filters.estado);
  const servicioId = filters.servicioId?.trim() || null;

  const counts = await getCmdbCounts(isSandbox);

  /** Personas (default) o pestaña explícita. */
  const vistaTipo = tipoFiltro ?? "usuario";
  const hasQ = Boolean(pattern);
  const hasServicio = Boolean(servicioId);
  const hasDominio = Boolean(dominio);
  const hasEstados = Boolean(estados && estados.length > 0);
  const estadosParam = estados ?? ["__none__"];
  const qParam = pattern ?? "%";
  const dominioParam = dominio ?? "";
  const servicioParam = servicioId ?? "";
  const activasParam = [...ESTADOS_ACTIVOS];

  const idRows = (await sql`
    WITH base AS (
      SELECT s.id, s.tipo, s.clave, s.display_name
      FROM sujetos s
      WHERE s.is_sandbox = ${isSandbox}
        AND s.tipo = ${vistaTipo}
        AND (
          NOT ${hasQ}
          OR lower(s.clave) LIKE ${qParam}
          OR lower(s.display_name) LIKE ${qParam}
          OR lower(s.notas) LIKE ${qParam}
          OR EXISTS (
            SELECT 1
            FROM excepcion_sujeto es
            INNER JOIN excepciones e ON e.id = es.excepcion_id
            WHERE es.sujeto_id = s.id
              AND e.is_sandbox = ${isSandbox}
              AND (
                lower(e.id) LIKE ${qParam}
                OR lower(e.solicitante_email) LIKE ${qParam}
                OR lower(e.activo_afectado) LIKE ${qParam}
              )
          )
          OR EXISTS (
            SELECT 1
            FROM excepcion_sujeto es1
            INNER JOIN excepciones e ON e.id = es1.excepcion_id
              AND e.is_sandbox = ${isSandbox}
            INNER JOIN excepcion_sujeto es2
              ON es2.excepcion_id = es1.excepcion_id
             AND es2.sujeto_id <> es1.sujeto_id
            INNER JOIN sujetos peer ON peer.id = es2.sujeto_id
            WHERE es1.sujeto_id = s.id
              AND (
                lower(peer.clave) LIKE ${qParam}
                OR lower(peer.display_name) LIKE ${qParam}
              )
          )
        )
        AND (
          NOT ${hasServicio}
          OR EXISTS (
            SELECT 1
            FROM excepcion_sujeto es1
            INNER JOIN excepcion_sujeto es2
              ON es2.excepcion_id = es1.excepcion_id
             AND es2.sujeto_id = ${servicioParam}
            WHERE es1.sujeto_id = s.id
          )
        )
        AND (
          NOT ${hasDominio}
          OR EXISTS (
            SELECT 1
            FROM excepcion_sujeto es
            INNER JOIN excepciones e ON e.id = es.excepcion_id
            WHERE es.sujeto_id = s.id
              AND e.is_sandbox = ${isSandbox}
              AND e.dominio = ${dominioParam}
          )
        )
        AND (
          NOT ${hasEstados}
          OR EXISTS (
            SELECT 1
            FROM excepcion_sujeto es
            INNER JOIN excepciones e ON e.id = es.excepcion_id
            WHERE es.sujeto_id = s.id
              AND e.is_sandbox = ${isSandbox}
              AND e.estado = ANY(${estadosParam})
          )
        )
    )
    SELECT id FROM base
    ORDER BY lower(display_name) ASC
  `) as Array<{ id: string }>;

  const allIds = idRows.map((r) => r.id);
  const total = allIds.length;
  const pageIds = allIds.slice(offset, offset + pageSize);

  if (pageIds.length === 0) {
    return { rows: [], total, page, pageSize, counts };
  }

  const sujetos = (await sql`
    SELECT id, tipo, clave, display_name
    FROM sujetos
    WHERE id = ANY(${pageIds})
  `) as Array<{
    id: string;
    tipo: string;
    clave: string;
    display_name: string;
  }>;

  const sujetoMap = new Map(sujetos.map((s) => [s.id, mapRef(s)]));

  // Stats + dominios por sujeto
  const statsRows = (await sql`
    SELECT
      es.sujeto_id,
      count(DISTINCT e.id)::int AS total,
      count(DISTINCT e.id) FILTER (
        WHERE e.estado = ANY(${activasParam})
      )::int AS activas,
      count(DISTINCT e.id) FILTER (WHERE e.estado = 'Pendiente')::int AS pendientes,
      count(DISTINCT e.id) FILTER (WHERE e.estado = 'Caducada')::int AS caducadas,
      array_remove(array_agg(DISTINCT e.dominio), NULL) AS dominios,
      (array_agg(e.id ORDER BY
        CASE e.estado WHEN 'Pendiente' THEN 0 WHEN 'Aprobada' THEN 1 ELSE 2 END,
        e.fecha_revision ASC
      ) FILTER (WHERE e.estado = ANY(${activasParam})))[1] AS ejemplo_id
    FROM excepcion_sujeto es
    INNER JOIN excepciones e ON e.id = es.excepcion_id AND e.is_sandbox = ${isSandbox}
    WHERE es.sujeto_id = ANY(${pageIds})
    GROUP BY es.sujeto_id
  `) as Array<{
    sujeto_id: string;
    total: number;
    activas: number;
    pendientes: number;
    caducadas: number;
    dominios: string[] | null;
    ejemplo_id: string | null;
  }>;

  const statsMap = new Map(statsRows.map((r) => [r.sujeto_id, r]));

  /**
   * Peers por excepción ACTIVA: origen ↔ (usuario|activo|servicio) en la misma excepción.
   * Así un servicio no “es” un equipo: aparecen usuarios y equipos distintos.
   */
  const relatedRows = (await sql`
    SELECT DISTINCT
      es1.sujeto_id AS origen_id,
      s2.id, s2.tipo, s2.clave, s2.display_name
    FROM excepcion_sujeto es1
    INNER JOIN excepciones e
      ON e.id = es1.excepcion_id
     AND e.is_sandbox = ${isSandbox}
     AND e.estado = ANY(${activasParam})
    INNER JOIN excepcion_sujeto es2
      ON es2.excepcion_id = es1.excepcion_id
     AND es2.sujeto_id <> es1.sujeto_id
    INNER JOIN sujetos s2 ON s2.id = es2.sujeto_id
    WHERE es1.sujeto_id = ANY(${pageIds})
      AND s2.tipo IN ('usuario', 'activo', 'servicio')
  `) as Array<{
    origen_id: string;
    id: string;
    tipo: string;
    clave: string;
    display_name: string;
  }>;

  const relatedByOrigen = new Map<string, CmdbRef[]>();
  for (const r of relatedRows) {
    const list = relatedByOrigen.get(r.origen_id) ?? [];
    list.push(mapRef(r));
    relatedByOrigen.set(r.origen_id, list);
  }

  const rows: CmdbMatrixRow[] = pageIds
    .map((id) => {
      const sujeto = sujetoMap.get(id);
      if (!sujeto) return null;
      const related = uniqRefs(relatedByOrigen.get(id) ?? []);
      const equipos = related.filter((r) => r.tipo === "activo");
      const servicios = related.filter((r) => r.tipo === "servicio");
      const usuarios = related.filter((r) => r.tipo === "usuario");
      const stats = statsMap.get(id);
      const dominios = (stats?.dominios ?? []).filter(Boolean) as Dominio[];

      return {
        sujeto,
        equipos,
        servicios,
        usuarios,
        dominios,
        n_usuarios: usuarios.length,
        n_equipos: equipos.length,
        activas: Number(stats?.activas) || 0,
        pendientes: Number(stats?.pendientes) || 0,
        caducadas: Number(stats?.caducadas) || 0,
        total_excepciones: Number(stats?.total) || 0,
        excepcion_ejemplo_id: stats?.ejemplo_id ?? null,
      } satisfies CmdbMatrixRow;
    })
    .filter((r): r is CmdbMatrixRow => r != null);

  return { rows, total, page, pageSize, counts };
}

/**
 * Ficha 360°: cada autorización = una excepción con usuario + equipo + servicios
 * resueltos desde excepcion_sujeto (fallback a campos denormalizados).
 */
export async function getCmdbFicha(
  sujetoId: string,
  isSandbox = false
): Promise<CmdbFicha | null> {
  const sujetos = (await sql`
    SELECT id, tipo, clave, display_name, notas
    FROM sujetos
    WHERE id = ${sujetoId}
    LIMIT 1
  `) as Array<{
    id: string;
    tipo: string;
    clave: string;
    display_name: string;
    notas: string;
  }>;

  if (!sujetos[0]) return null;
  const s = sujetos[0];
  const sujeto = {
    ...mapRef(s),
    notas: s.notas ?? "",
  };

  const excRows = (await sql`
    SELECT
      e.id, e.dominio, e.tipo_excepcion, e.estado,
      e.fecha_revision, e.temporalidad,
      e.solicitante_email, e.activo_afectado
    FROM excepciones e
    INNER JOIN excepcion_sujeto es ON es.excepcion_id = e.id
    WHERE es.sujeto_id = ${sujetoId}
      AND e.is_sandbox = ${isSandbox}
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
    fecha_revision: string | Date;
    temporalidad: string;
    solicitante_email: string;
    activo_afectado: string;
  }>;

  const excIds = excRows.map((e) => e.id);

  /** Todos los sujetos de cada excepción (incluido el actual). */
  const linkedRows =
    excIds.length === 0
      ? []
      : ((await sql`
          SELECT
            es.excepcion_id,
            s.id, s.tipo, s.clave, s.display_name
          FROM excepcion_sujeto es
          INNER JOIN sujetos s ON s.id = es.sujeto_id
          WHERE es.excepcion_id = ANY(${excIds})
            AND s.tipo IN ('usuario', 'activo', 'servicio')
          ORDER BY s.tipo, s.display_name
        `) as Array<{
          excepcion_id: string;
          id: string;
          tipo: string;
          clave: string;
          display_name: string;
        }>);

  const byExc = new Map<string, CmdbRef[]>();
  for (const row of linkedRows) {
    const list = byExc.get(row.excepcion_id) ?? [];
    list.push(mapRef(row));
    byExc.set(row.excepcion_id, list);
  }

  const autorizaciones: CmdbAutorizacion[] = excRows.map((e) => {
    const linked = byExc.get(e.id) ?? [];
    let usuario = linked.find((x) => x.tipo === "usuario") ?? null;
    let equipo = linked.find((x) => x.tipo === "activo") ?? null;
    const servicios = uniqRefs(linked.filter((x) => x.tipo === "servicio"));

    if (!usuario && e.solicitante_email) {
      usuario = {
        id: "",
        tipo: "usuario",
        clave: e.solicitante_email,
        display_name: e.solicitante_email,
      };
    }
    if (!equipo && e.activo_afectado) {
      equipo = {
        id: "",
        tipo: "activo",
        clave: e.activo_afectado,
        display_name: e.activo_afectado,
      };
    }

    return {
      excepcion_id: e.id,
      dominio: e.dominio as Dominio,
      tipo_excepcion: e.tipo_excepcion,
      estado: e.estado as EstadoExcepcion,
      fecha_revision: toDateString(e.fecha_revision),
      temporalidad: e.temporalidad,
      usuario,
      equipo,
      servicios,
    };
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in15 = new Date(today);
  in15.setDate(in15.getDate() + 15);

  const activas = autorizaciones.filter(
    (a) => a.estado === "Pendiente" || a.estado === "Aprobada"
  );
  const pendientes = autorizaciones.filter((a) => a.estado === "Pendiente");
  const revisionProximas = activas.filter((a) => {
    if (!a.fecha_revision) return false;
    const d = new Date(a.fecha_revision + "T00:00:00");
    return d >= today && d <= in15;
  }).length;

  const notSelf = (x: CmdbRef) => x.id !== sujeto.id;

  return {
    sujeto,
    metrics: {
      total: autorizaciones.length,
      activas: activas.length,
      pendientes: pendientes.length,
      revisionProximas,
    },
    autorizaciones,
    impactoServicios: uniqRefs(
      autorizaciones.flatMap((a) => a.servicios)
    ).filter(notSelf),
    impactoEquipos: uniqRefs(
      autorizaciones
        .map((a) => a.equipo)
        .filter((x): x is CmdbRef => x != null && Boolean(x.clave))
    ).filter(notSelf),
    impactoUsuarios: uniqRefs(
      autorizaciones
        .map((a) => a.usuario)
        .filter((x): x is CmdbRef => x != null && Boolean(x.clave))
    ).filter(notSelf),
  };
}

export async function getSujetoTipoById(
  id: string
): Promise<string | null> {
  const rows = (await sql`
    SELECT tipo FROM sujetos WHERE id = ${id} LIMIT 1
  `) as Array<{ tipo: string }>;
  return rows[0]?.tipo ?? null;
}

export async function unlinkSujetoFromExcepcion(
  excepcionId: string,
  sujetoId: string
): Promise<void> {
  await sql`
    DELETE FROM excepcion_sujeto
    WHERE excepcion_id = ${excepcionId}
      AND sujeto_id = ${sujetoId}
  `;
}

export function cmdbRowsToCsv(rows: CmdbMatrixRow[]): string {
  const header = [
    "tipo",
    "id",
    "nombre",
    "clave",
    "equipos",
    "servicios",
    "usuarios",
    "n_usuarios",
    "n_equipos",
    "dominios",
    "activas",
    "pendientes",
    "caducadas",
    "total_excepciones",
  ].join(",");

  const escape = (v: string) => {
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  };

  const lines = rows.map((r) =>
    [
      r.sujeto.tipo,
      r.sujeto.id,
      escape(r.sujeto.display_name),
      escape(r.sujeto.clave),
      escape(r.equipos.map((e) => e.display_name).join("; ")),
      escape(r.servicios.map((e) => e.display_name).join("; ")),
      escape(r.usuarios.map((e) => e.display_name).join("; ")),
      String(r.n_usuarios),
      String(r.n_equipos),
      escape(r.dominios.join("; ")),
      String(r.activas),
      String(r.pendientes),
      String(r.caducadas),
      String(r.total_excepciones),
    ].join(",")
  );

  return [header, ...lines].join("\n") + "\n";
}

export type { CmdbTipoFiltro };
