import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { listExcepcionesBySujeto } from "@/lib/sujetos/repository";
import type {
  EventoOperativo,
  EventoOperativoDetalle,
  EventoOperativoListItem,
  TipoEventoOperativo,
} from "@/types/operaciones";

export type {
  EventoOperativo,
  EventoOperativoDetalle,
  EventoOperativoListItem,
  TipoEventoOperativo,
} from "@/types/operaciones";

function toIso(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapEventoBase(row: {
  id: string;
  tipo: string;
  sujeto_id: string;
  actor_email: string;
  notas: string;
  estado: string;
  created_at: string | Date;
  closed_at: string | Date | null;
}): EventoOperativo {
  return {
    id: row.id,
    tipo: row.tipo as TipoEventoOperativo,
    sujeto_id: row.sujeto_id,
    actor_email: row.actor_email,
    notas: row.notas,
    estado: row.estado as "Abierto" | "Cerrado",
    created_at: toIso(row.created_at) ?? "",
    closed_at: toIso(row.closed_at),
  };
}

function newId() {
  return `op-${randomBytes(5).toString("hex")}`;
}

export async function createEventoOperativo(input: {
  tipo: TipoEventoOperativo;
  sujetoId: string;
  actorEmail: string;
  notas?: string;
}): Promise<EventoOperativoDetalle> {
  const id = newId();
  const activas = (await listExcepcionesBySujeto(input.sujetoId)).filter(
    (e) => e.estado === "Pendiente" || e.estado === "Aprobada"
  );

  await sql`
    INSERT INTO eventos_operativos (
      id, tipo, sujeto_id, actor_email, notas, estado
    ) VALUES (
      ${id},
      ${input.tipo},
      ${input.sujetoId},
      ${input.actorEmail},
      ${input.notas?.trim() ?? ""},
      ${"Abierto"}
    )
  `;

  for (const exc of activas) {
    await sql`
      INSERT INTO evento_operativo_excepcion (evento_id, excepcion_id, revisada)
      VALUES (${id}, ${exc.id}, ${false})
    `;
  }

  const created = await getEventoOperativo(id);
  if (!created) throw new Error("No se pudo crear el evento operativo.");
  return created;
}

export async function getEventoOperativo(
  id: string
): Promise<EventoOperativoDetalle | null> {
  const rows = (await sql`
    SELECT id, tipo, sujeto_id, actor_email, notas, estado, created_at, closed_at
    FROM eventos_operativos
    WHERE id = ${id}
    LIMIT 1
  `) as Array<{
    id: string;
    tipo: string;
    sujeto_id: string;
    actor_email: string;
    notas: string;
    estado: string;
    created_at: string | Date;
    closed_at: string | Date | null;
  }>;

  if (!rows[0]) return null;
  const row = rows[0];

  const links = (await sql`
    SELECT eoe.excepcion_id, eoe.revisada,
           e.tipo_excepcion, e.dominio, e.estado
    FROM evento_operativo_excepcion eoe
    INNER JOIN excepciones e ON e.id = eoe.excepcion_id
    WHERE eoe.evento_id = ${id}
    ORDER BY e.id ASC
  `) as Array<{
    excepcion_id: string;
    revisada: boolean;
    tipo_excepcion: string;
    dominio: string;
    estado: string;
  }>;

  return {
    ...mapEventoBase(row),
    excepciones: links.map((l) => ({
      id: l.excepcion_id,
      tipo_excepcion: l.tipo_excepcion,
      dominio: l.dominio,
      estado: l.estado,
      revisada: Boolean(l.revisada),
    })),
  };
}

export async function listEventosOperativosBySujeto(
  sujetoId: string
): Promise<EventoOperativo[]> {
  const rows = (await sql`
    SELECT id, tipo, sujeto_id, actor_email, notas, estado, created_at, closed_at
    FROM eventos_operativos
    WHERE sujeto_id = ${sujetoId}
    ORDER BY created_at DESC
    LIMIT 20
  `) as Array<{
    id: string;
    tipo: string;
    sujeto_id: string;
    actor_email: string;
    notas: string;
    estado: string;
    created_at: string | Date;
    closed_at: string | Date | null;
  }>;

  return rows.map(mapEventoBase);
}

/** Listado global para el panel de Operaciones. */
export async function listEventosOperativos(filters?: {
  estado?: "Abierto" | "Cerrado" | "Todos";
  limit?: number;
}): Promise<EventoOperativoListItem[]> {
  const estado = filters?.estado ?? "Todos";
  const limit = filters?.limit ?? 100;

  const rows = (await sql`
    SELECT
      eo.id, eo.tipo, eo.sujeto_id, eo.actor_email, eo.notas, eo.estado,
      eo.created_at, eo.closed_at,
      s.display_name AS sujeto_display,
      s.tipo AS sujeto_tipo,
      s.clave AS sujeto_clave,
      count(eoe.excepcion_id)::int AS total_excepciones,
      count(eoe.excepcion_id) FILTER (WHERE eoe.revisada = FALSE)::int AS pendientes_revision
    FROM eventos_operativos eo
    INNER JOIN sujetos s ON s.id = eo.sujeto_id
    LEFT JOIN evento_operativo_excepcion eoe ON eoe.evento_id = eo.id
    WHERE (${estado} = 'Todos' OR eo.estado = ${estado})
    GROUP BY
      eo.id, eo.tipo, eo.sujeto_id, eo.actor_email, eo.notas, eo.estado,
      eo.created_at, eo.closed_at, s.display_name, s.tipo, s.clave
    ORDER BY
      CASE eo.estado WHEN 'Abierto' THEN 0 ELSE 1 END,
      eo.created_at DESC
    LIMIT ${limit}
  `) as Array<{
    id: string;
    tipo: string;
    sujeto_id: string;
    actor_email: string;
    notas: string;
    estado: string;
    created_at: string | Date;
    closed_at: string | Date | null;
    sujeto_display: string;
    sujeto_tipo: string;
    sujeto_clave: string;
    total_excepciones: number;
    pendientes_revision: number;
  }>;

  return rows.map((row) => ({
    ...mapEventoBase(row),
    sujeto_display: row.sujeto_display || row.sujeto_clave,
    sujeto_tipo: row.sujeto_tipo,
    sujeto_clave: row.sujeto_clave,
    total_excepciones: Number(row.total_excepciones) || 0,
    pendientes_revision: Number(row.pendientes_revision) || 0,
  }));
}

export async function marcarExcepcionRevisada(
  eventoId: string,
  excepcionId: string,
  revisada: boolean
): Promise<void> {
  await sql`
    UPDATE evento_operativo_excepcion SET
      revisada = ${revisada}
    WHERE evento_id = ${eventoId} AND excepcion_id = ${excepcionId}
  `;
}

export async function cerrarEventoOperativo(
  eventoId: string
): Promise<EventoOperativoDetalle> {
  await sql`
    UPDATE eventos_operativos SET
      estado = ${"Cerrado"},
      closed_at = NOW()
    WHERE id = ${eventoId}
  `;
  const updated = await getEventoOperativo(eventoId);
  if (!updated) throw new Error("Evento no encontrado");
  return updated;
}
