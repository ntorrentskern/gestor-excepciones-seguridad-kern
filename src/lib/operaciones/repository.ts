import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { generarIdEvento } from "@/lib/excepciones/utils";
import { listExcepcionesBySujeto, setSujetosForExcepcion } from "@/lib/sujetos/repository";
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
           e.tipo_excepcion, e.dominio, e.estado,
           e.solicitante_email, e.activo_afectado
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
    solicitante_email: string;
    activo_afectado: string;
  }>;

  return {
    ...mapEventoBase(row),
    excepciones: links.map((l) => ({
      id: l.excepcion_id,
      tipo_excepcion: l.tipo_excepcion,
      dominio: l.dominio,
      estado: l.estado,
      revisada: Boolean(l.revisada),
      solicitante_email: l.solicitante_email,
      activo_afectado: l.activo_afectado,
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
  /** true = solo demo; false = solo reales. */
  is_sandbox?: boolean;
}): Promise<EventoOperativoListItem[]> {
  const estado = filters?.estado ?? "Todos";
  const limit = filters?.limit ?? 100;
  const isSandbox = Boolean(filters?.is_sandbox);

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
    LEFT JOIN excepciones e ON e.id = eoe.excepcion_id AND e.is_sandbox = ${isSandbox}
    WHERE (${estado} = 'Todos' OR eo.estado = ${estado})
      AND s.is_sandbox = ${isSandbox}
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

/**
 * Reasigna usuario y/o PC de una excepción desde un evento operativo.
 * No marca como revisada: eso sigue siendo manual.
 */
export async function reasignarExcepcionEnOperacion(input: {
  eventoId: string;
  excepcionId: string;
  actorEmail: string;
  nuevoUsuario?: string;
  nuevoActivo?: string;
}): Promise<EventoOperativoDetalle> {
  const evento = await getEventoOperativo(input.eventoId);
  if (!evento) throw new Error("Evento no encontrado");
  if (evento.estado !== "Abierto") {
    throw new Error("El evento ya está cerrado.");
  }

  const linked = evento.excepciones.some((e) => e.id === input.excepcionId);
  if (!linked) {
    throw new Error("La excepción no pertenece a este evento.");
  }

  const nuevoUsuario = input.nuevoUsuario?.trim() ?? "";
  const nuevoActivo = input.nuevoActivo?.trim() ?? "";
  if (!nuevoUsuario && !nuevoActivo) {
    throw new Error("Indica un nuevo usuario y/o un nuevo PC.");
  }

  const rows = (await sql`
    SELECT id, solicitante_email, activo_afectado, is_sandbox
    FROM excepciones
    WHERE id = ${input.excepcionId}
    LIMIT 1
  `) as Array<{
    id: string;
    solicitante_email: string;
    activo_afectado: string;
    is_sandbox: boolean;
  }>;
  const current = rows[0];
  if (!current) throw new Error("Excepción no encontrada");

  const nextUsuario = nuevoUsuario || current.solicitante_email;
  const nextActivo = nuevoActivo || current.activo_afectado;

  await sql`
    UPDATE excepciones SET
      solicitante_email = ${nextUsuario},
      activo_afectado = ${nextActivo},
      updated_at = NOW()
    WHERE id = ${input.excepcionId}
  `;

  const sujetos: Array<{
    tipo: "usuario" | "activo";
    clave: string;
    display_name: string;
    is_sandbox?: boolean;
  }> = [];
  if (nextUsuario.trim()) {
    sujetos.push({
      tipo: "usuario",
      clave: nextUsuario,
      display_name: nextUsuario,
      is_sandbox: Boolean(current.is_sandbox),
    });
  }
  if (nextActivo.trim()) {
    sujetos.push({
      tipo: "activo",
      clave: nextActivo,
      display_name: nextActivo,
      is_sandbox: Boolean(current.is_sandbox),
    });
  }
  await setSujetosForExcepcion(input.excepcionId, sujetos);

  const partes: string[] = [];
  if (nuevoUsuario && nuevoUsuario !== current.solicitante_email) {
    partes.push(
      `usuario «${current.solicitante_email}» → «${nuevoUsuario}»`
    );
  }
  if (nuevoActivo && nuevoActivo !== current.activo_afectado) {
    partes.push(`equipo «${current.activo_afectado}» → «${nuevoActivo}»`);
  }

  const detalle = `Reasignación en operación ${input.eventoId}: ${partes.join("; ") || "sin cambios efectivos"}.`;

  const histCount = (
    (await sql`
      SELECT count(*)::int AS n FROM eventos_auditoria
      WHERE excepcion_id = ${input.excepcionId}
    `) as Array<{ n: number }>
  )[0]?.n ?? 0;

  const audId = generarIdEvento(input.excepcionId, histCount);
  await sql`
    INSERT INTO eventos_auditoria (
      id, excepcion_id, tipo, actor_email, detalle, estado_anterior, estado_nuevo
    ) VALUES (
      ${audId},
      ${input.excepcionId},
      ${"Comentario"},
      ${input.actorEmail},
      ${detalle},
      ${null},
      ${null}
    )
  `;

  return (await getEventoOperativo(input.eventoId))!;
}

/** Aplica la misma reasignación a todas las excepciones del evento (no marca revisadas). */
export async function reasignarTodasEnOperacion(input: {
  eventoId: string;
  actorEmail: string;
  nuevoUsuario?: string;
  nuevoActivo?: string;
}): Promise<EventoOperativoDetalle> {
  const evento = await getEventoOperativo(input.eventoId);
  if (!evento) throw new Error("Evento no encontrado");
  if (evento.estado !== "Abierto") {
    throw new Error("El evento ya está cerrado.");
  }

  for (const exc of evento.excepciones) {
    await reasignarExcepcionEnOperacion({
      eventoId: input.eventoId,
      excepcionId: exc.id,
      actorEmail: input.actorEmail,
      nuevoUsuario: input.nuevoUsuario,
      nuevoActivo: input.nuevoActivo,
    });
  }

  return (await getEventoOperativo(input.eventoId))!;
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
