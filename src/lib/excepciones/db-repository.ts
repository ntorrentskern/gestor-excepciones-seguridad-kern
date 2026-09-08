import { sql } from "@/lib/db";
import {
  ahoraISO,
  formatearFecha,
  generarIdEvento,
  generarSiguienteId,
  hoyISO,
} from "@/lib/excepciones/utils";
import type {
  EditarExcepcionInput,
  EstadoExcepcion,
  EventoAuditoria,
  Excepcion,
  ExcepcionFilters,
  NuevaExcepcionInput,
  OrigenSolicitud,
  Temporalidad,
  TipoEventoAuditoria,
  TipoExcepcion,
} from "@/types/excepcion";
import { ACTOR_OTS_ACTUAL } from "@/types/excepcion";
import type {
  AmpliarInput,
  DecisionInput,
  ExcepcionesRepository,
  ReactivarInput,
} from "@/lib/excepciones/types";

type ExcepcionRow = {
  id: string;
  tipo_excepcion: string;
  origen_solicitud: string;
  jira_ticket_id: string | null;
  solicitante_email: string;
  activo_afectado: string;
  justificacion: string;
  control_compensatorio: string;
  estado: string;
  temporalidad: string;
  fecha_solicitud: string | Date;
  fecha_revision: string | Date;
  aprobador_email: string | null;
  fecha_decision: string | Date | null;
};

type EventoRow = {
  id: string;
  excepcion_id: string;
  tipo: string;
  actor_email: string;
  timestamp: string | Date;
  detalle: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
};

function toDateString(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return formatDateOnly(value);
  }
  const raw = String(value);
  return raw.includes("T") ? raw.slice(0, 10) : raw.slice(0, 10);
}

function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toIsoTimestamp(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapEvento(row: EventoRow): EventoAuditoria {
  return {
    id: row.id,
    tipo: row.tipo as TipoEventoAuditoria,
    actor_email: row.actor_email,
    timestamp: toIsoTimestamp(row.timestamp),
    detalle: row.detalle,
    estado_anterior: (row.estado_anterior as EstadoExcepcion | null) ?? null,
    estado_nuevo: (row.estado_nuevo as EstadoExcepcion | null) ?? null,
  };
}

function mapExcepcion(row: ExcepcionRow, historial: EventoAuditoria[]): Excepcion {
  return {
    id: row.id,
    tipo_excepcion: row.tipo_excepcion as TipoExcepcion,
    origen_solicitud: row.origen_solicitud as OrigenSolicitud,
    jira_ticket_id: row.jira_ticket_id,
    solicitante_email: row.solicitante_email,
    activo_afectado: row.activo_afectado,
    justificacion: row.justificacion,
    control_compensatorio: row.control_compensatorio ?? "",
    estado: row.estado as EstadoExcepcion,
    temporalidad: row.temporalidad as Temporalidad,
    fecha_solicitud: toDateString(row.fecha_solicitud) ?? hoyISO(),
    fecha_revision: toDateString(row.fecha_revision) ?? hoyISO(),
    aprobador_email: row.aprobador_email,
    fecha_decision: toDateString(row.fecha_decision),
    historial,
  };
}

async function loadHistorial(excepcionId: string): Promise<EventoAuditoria[]> {
  const rows = (await sql`
    SELECT id, excepcion_id, tipo, actor_email, "timestamp", detalle,
           estado_anterior, estado_nuevo
    FROM eventos_auditoria
    WHERE excepcion_id = ${excepcionId}
    ORDER BY "timestamp" DESC
  `) as EventoRow[];
  return rows.map(mapEvento);
}

async function loadHistoriales(
  ids: string[]
): Promise<Map<string, EventoAuditoria[]>> {
  const map = new Map<string, EventoAuditoria[]>();
  if (ids.length === 0) return map;

  const rows = (await sql`
    SELECT id, excepcion_id, tipo, actor_email, "timestamp", detalle,
           estado_anterior, estado_nuevo
    FROM eventos_auditoria
    WHERE excepcion_id = ANY(${ids})
    ORDER BY "timestamp" DESC
  `) as EventoRow[];

  for (const row of rows) {
    const list = map.get(row.excepcion_id) ?? [];
    list.push(mapEvento(row));
    map.set(row.excepcion_id, list);
  }
  return map;
}

function applyFilters(
  items: Excepcion[],
  filters?: ExcepcionFilters
): Excepcion[] {
  if (!filters) return items;
  const q = filters.busqueda?.trim().toLowerCase();

  return items.filter((item) => {
    if (
      filters.estado &&
      filters.estado !== "Todos" &&
      item.estado !== filters.estado
    ) {
      return false;
    }
    if (
      filters.tipo_excepcion &&
      filters.tipo_excepcion !== "Todos" &&
      item.tipo_excepcion !== filters.tipo_excepcion
    ) {
      return false;
    }
    if (q) {
      const blob = [
        item.id,
        item.tipo_excepcion,
        item.origen_solicitud,
        item.jira_ticket_id ?? "",
        item.solicitante_email,
        item.activo_afectado,
        item.justificacion,
        item.aprobador_email ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}

function requireEstado(
  excepcion: Excepcion,
  permitidos: EstadoExcepcion[],
  accion: string
) {
  if (!permitidos.includes(excepcion.estado)) {
    throw new Error(
      `No se puede ${accion} una excepción en estado «${excepcion.estado}».`
    );
  }
}

async function insertEvento(
  excepcionId: string,
  evento: Omit<EventoAuditoria, "id" | "timestamp"> & { timestamp?: string },
  historialLength: number
): Promise<EventoAuditoria> {
  const entry: EventoAuditoria = {
    id: generarIdEvento(excepcionId, historialLength),
    timestamp: evento.timestamp ?? ahoraISO(),
    tipo: evento.tipo,
    actor_email: evento.actor_email,
    detalle: evento.detalle,
    estado_anterior: evento.estado_anterior ?? null,
    estado_nuevo: evento.estado_nuevo ?? null,
  };

  await sql`
    INSERT INTO eventos_auditoria (
      id, excepcion_id, tipo, actor_email, "timestamp", detalle,
      estado_anterior, estado_nuevo
    ) VALUES (
      ${entry.id},
      ${excepcionId},
      ${entry.tipo},
      ${entry.actor_email},
      ${entry.timestamp},
      ${entry.detalle},
      ${entry.estado_anterior},
      ${entry.estado_nuevo}
    )
  `;

  return entry;
}

async function getByIdInternal(id: string): Promise<Excepcion | null> {
  const rows = (await sql`
    SELECT *
    FROM excepciones
    WHERE id = ${id}
    LIMIT 1
  `) as ExcepcionRow[];

  if (rows.length === 0) return null;
  const historial = await loadHistorial(id);
  return mapExcepcion(rows[0], historial);
}

/**
 * Pasa a Caducada las excepciones Pendiente/Aprobada cuya fecha de revisión
 * ya ha pasado (requieren revisión).
 */
async function syncCaducadasAutomaticas(): Promise<void> {
  const hoy = hoyISO();
  const vencidas = (await sql`
    SELECT id, estado
    FROM excepciones
    WHERE estado IN ('Pendiente', 'Aprobada')
      AND fecha_revision < ${hoy}
  `) as Array<{ id: string; estado: string }>;

  for (const row of vencidas) {
    const current = await getByIdInternal(row.id);
    if (!current) continue;

    await sql`
      UPDATE excepciones SET
        estado = ${"Caducada"},
        updated_at = NOW()
      WHERE id = ${row.id}
        AND estado IN ('Pendiente', 'Aprobada')
        AND fecha_revision < ${hoy}
    `;

    await insertEvento(
      row.id,
      {
        tipo: "Caducada",
        actor_email: "sistema",
        detalle:
          "Caducada automáticamente al alcanzar la fecha de revisión sin renovar ni cerrar.",
        estado_anterior: current.estado,
        estado_nuevo: "Caducada",
      },
      current.historial.length
    );
  }
}

export const neonExcepcionesRepository: ExcepcionesRepository = {
  async list(filters) {
    await syncCaducadasAutomaticas();
    const rows = (await sql`
      SELECT *
      FROM excepciones
      ORDER BY id ASC
    `) as ExcepcionRow[];

    const historiales = await loadHistoriales(rows.map((r) => r.id));
    const items = rows.map((row) =>
      mapExcepcion(row, historiales.get(row.id) ?? [])
    );
    return applyFilters(items, filters);
  },

  async getById(id) {
    await syncCaducadasAutomaticas();
    return getByIdInternal(id);
  },

  async create(input) {
    if (input.origen_solicitud === "Jira" && !input.jira_ticket_id?.trim()) {
      throw new Error("Indica el ID del ticket de Jira.");
    }

    const existing = (await sql`SELECT id FROM excepciones`) as { id: string }[];
    const id = generarSiguienteId(existing);

    const estado = input.estado ?? "Pendiente";
    const solicitante = input.solicitante_email.trim();
    const registrador = input.aprobador_email.trim();
    if (!registrador) {
      throw new Error("Indica el aprobador / registrador.");
    }
    const fechaSolicitud = hoyISO();
    const jiraTicket =
      input.origen_solicitud === "Jira"
        ? input.jira_ticket_id!.trim()
        : null;

    await sql`
      INSERT INTO excepciones (
        id, tipo_excepcion, origen_solicitud, jira_ticket_id,
        solicitante_email, activo_afectado, justificacion,
        control_compensatorio, estado, temporalidad,
        fecha_solicitud, fecha_revision, aprobador_email, fecha_decision
      ) VALUES (
        ${id},
        ${input.tipo_excepcion},
        ${input.origen_solicitud},
        ${jiraTicket},
        ${solicitante},
        ${input.activo_afectado.trim()},
        ${input.justificacion.trim()},
        ${input.control_compensatorio?.trim() ?? ""},
        ${estado},
        ${input.temporalidad},
        ${fechaSolicitud},
        ${input.fecha_revision},
        ${registrador},
        ${null}
      )
    `;

    await insertEvento(
      id,
      {
        tipo: "Creada",
        actor_email: registrador,
        detalle: "Alta de excepción de seguridad.",
        estado_anterior: null,
        estado_nuevo: estado,
      },
      0
    );

    const created = await getByIdInternal(id);
    if (!created) {
      throw new Error("No se pudo leer la excepción recién creada.");
    }
    return created;
  },

  async update(id, patch) {
    const current = await getByIdInternal(id);
    if (!current) throw new Error(`Excepción no encontrada: ${id}`);

    const next = { ...current, ...patch, id };
    await sql`
      UPDATE excepciones SET
        tipo_excepcion = ${next.tipo_excepcion},
        origen_solicitud = ${next.origen_solicitud},
        jira_ticket_id = ${next.jira_ticket_id},
        solicitante_email = ${next.solicitante_email},
        activo_afectado = ${next.activo_afectado},
        justificacion = ${next.justificacion},
        control_compensatorio = ${next.control_compensatorio ?? ""},
        estado = ${next.estado},
        temporalidad = ${next.temporalidad},
        fecha_solicitud = ${next.fecha_solicitud},
        fecha_revision = ${next.fecha_revision},
        aprobador_email = ${next.aprobador_email},
        fecha_decision = ${next.fecha_decision},
        updated_at = NOW()
      WHERE id = ${id}
    `;
    return (await getByIdInternal(id))!;
  },

  async editar(id, input: EditarExcepcionInput) {
    const current = await getByIdInternal(id);
    if (!current) throw new Error(`Excepción no encontrada: ${id}`);

    if (input.origen_solicitud === "Jira" && !input.jira_ticket_id?.trim()) {
      throw new Error("Indica el ID del ticket de Jira.");
    }

    const actor = input.actorEmail.trim();
    if (!actor) throw new Error("Indica el actor de la edición.");

    const jiraTicket =
      input.origen_solicitud === "Jira"
        ? input.jira_ticket_id!.trim()
        : null;

    const next = {
      tipo_excepcion: input.tipo_excepcion,
      origen_solicitud: input.origen_solicitud,
      jira_ticket_id: jiraTicket,
      solicitante_email: input.solicitante_email.trim(),
      activo_afectado: input.activo_afectado.trim(),
      justificacion: input.justificacion.trim(),
      control_compensatorio: input.control_compensatorio?.trim() ?? "",
      estado: input.estado,
      temporalidad: input.temporalidad,
      fecha_revision: input.fecha_revision,
    };

    const cambios: string[] = [];
    const labels: Record<string, string> = {
      tipo_excepcion: "tipo",
      origen_solicitud: "origen",
      jira_ticket_id: "ticket Jira",
      solicitante_email: "solicitante",
      activo_afectado: "activos",
      justificacion: "justificación",
      control_compensatorio: "control compensatorio",
      estado: "estado",
      temporalidad: "temporalidad",
      fecha_revision: "fecha revisión",
    };

    for (const key of Object.keys(labels) as Array<keyof typeof next>) {
      const before = String(current[key] ?? "");
      const after = String(next[key] ?? "");
      if (before !== after) {
        cambios.push(`${labels[key]}: «${before || "—"}» → «${after || "—"}»`);
      }
    }

    if (cambios.length === 0) {
      throw new Error("No hay cambios que guardar.");
    }

    const estadoCambio = current.estado !== next.estado;
    const fechaDecision =
      estadoCambio &&
      (next.estado === "Aprobada" || next.estado === "Rechazada")
        ? hoyISO()
        : current.fecha_decision;

    await sql`
      UPDATE excepciones SET
        tipo_excepcion = ${next.tipo_excepcion},
        origen_solicitud = ${next.origen_solicitud},
        jira_ticket_id = ${next.jira_ticket_id},
        solicitante_email = ${next.solicitante_email},
        activo_afectado = ${next.activo_afectado},
        justificacion = ${next.justificacion},
        control_compensatorio = ${next.control_compensatorio},
        estado = ${next.estado},
        temporalidad = ${next.temporalidad},
        fecha_revision = ${next.fecha_revision},
        fecha_decision = ${fechaDecision},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    const motivo = input.motivo?.trim();
    await insertEvento(
      id,
      {
        tipo: "Editada",
        actor_email: actor,
        detalle: [
          "Edición de datos de la excepción.",
          ...cambios,
          motivo ? `Motivo: ${motivo}` : null,
        ]
          .filter(Boolean)
          .join(" "),
        estado_anterior: current.estado,
        estado_nuevo: next.estado,
      },
      current.historial.length
    );

    return (await getByIdInternal(id))!;
  },

  async aprobar(id, input = {}) {
    const current = await getByIdInternal(id);
    if (!current) throw new Error(`Excepción no encontrada: ${id}`);
    requireEstado(current, ["Pendiente"], "aprobar");

    const actor = input.actorEmail ?? ACTOR_OTS_ACTUAL;
    const fechaDecision = hoyISO();

    await sql`
      UPDATE excepciones SET
        estado = ${"Aprobada"},
        aprobador_email = ${actor},
        fecha_decision = ${fechaDecision},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    await insertEvento(
      id,
      {
        tipo: "Aprobada",
        actor_email: actor,
        detalle: input.motivo?.trim() || "Excepción aprobada por OTS.",
        estado_anterior: current.estado,
        estado_nuevo: "Aprobada",
      },
      current.historial.length
    );

    return (await getByIdInternal(id))!;
  },

  async rechazar(id, input = {}) {
    const current = await getByIdInternal(id);
    if (!current) throw new Error(`Excepción no encontrada: ${id}`);
    requireEstado(current, ["Pendiente"], "rechazar");

    const actor = input.actorEmail ?? ACTOR_OTS_ACTUAL;
    const fechaDecision = hoyISO();

    await sql`
      UPDATE excepciones SET
        estado = ${"Rechazada"},
        aprobador_email = ${actor},
        fecha_decision = ${fechaDecision},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    await insertEvento(
      id,
      {
        tipo: "Rechazada",
        actor_email: actor,
        detalle: input.motivo?.trim() || "Excepción rechazada por OTS.",
        estado_anterior: current.estado,
        estado_nuevo: "Rechazada",
      },
      current.historial.length
    );

    return (await getByIdInternal(id))!;
  },

  async cancelar(id, input = {}) {
    const current = await getByIdInternal(id);
    if (!current) throw new Error(`Excepción no encontrada: ${id}`);
    requireEstado(
      current,
      ["Aprobada", "Pendiente", "Caducada"],
      "cancelar"
    );

    const actor = input.actorEmail ?? ACTOR_OTS_ACTUAL;

    await sql`
      UPDATE excepciones SET
        estado = ${"Cancelada"},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    await insertEvento(
      id,
      {
        tipo: "Cancelada",
        actor_email: actor,
        detalle:
          input.motivo?.trim() ||
          "Excepción cancelada (cerrada: no se renueva o ya no es necesaria).",
        estado_anterior: current.estado,
        estado_nuevo: "Cancelada",
      },
      current.historial.length
    );

    return (await getByIdInternal(id))!;
  },

  async ampliar(id, input) {
    const current = await getByIdInternal(id);
    if (!current) throw new Error(`Excepción no encontrada: ${id}`);
    requireEstado(current, ["Aprobada", "Caducada"], "ampliar");

    if (!input.nuevaFechaRevision) {
      throw new Error("Indica la nueva fecha de revisión.");
    }
    if (input.nuevaFechaRevision <= current.fecha_revision) {
      throw new Error(
        "La nueva fecha de revisión debe ser posterior a la actual."
      );
    }

    const actor = input.actorEmail ?? ACTOR_OTS_ACTUAL;
    const anterior = formatearFecha(current.fecha_revision);
    const nueva = formatearFecha(input.nuevaFechaRevision);

    await sql`
      UPDATE excepciones SET
        fecha_revision = ${input.nuevaFechaRevision},
        estado = ${"Aprobada"},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    await insertEvento(
      id,
      {
        tipo: "Ampliada",
        actor_email: actor,
        detalle: `Ampliación de revisión del ${anterior} al ${nueva}. ${input.motivo.trim()}`,
        estado_anterior: current.estado,
        estado_nuevo: "Aprobada",
      },
      current.historial.length
    );

    return (await getByIdInternal(id))!;
  },

  async reactivar(id, input) {
    const current = await getByIdInternal(id);
    if (!current) throw new Error(`Excepción no encontrada: ${id}`);
    requireEstado(
      current,
      ["Cancelada", "Rechazada"],
      "reactivar"
    );

    if (!input.nuevaFechaRevision) {
      throw new Error("Indica la nueva fecha de revisión.");
    }

    const actor = input.actorEmail ?? ACTOR_OTS_ACTUAL;
    const fechaDecision = hoyISO();

    await sql`
      UPDATE excepciones SET
        estado = ${"Aprobada"},
        fecha_revision = ${input.nuevaFechaRevision},
        aprobador_email = ${actor},
        fecha_decision = ${fechaDecision},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    await insertEvento(
      id,
      {
        tipo: "Reactivada",
        actor_email: actor,
        detalle:
          input.motivo?.trim() ||
          `Reactivada con revisión ${formatearFecha(input.nuevaFechaRevision)}.`,
        estado_anterior: current.estado,
        estado_nuevo: "Aprobada",
      },
      current.historial.length
    );

    return (await getByIdInternal(id))!;
  },
};
