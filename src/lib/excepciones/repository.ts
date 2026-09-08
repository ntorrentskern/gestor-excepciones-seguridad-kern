/**
 * Capa de acceso a datos de excepciones.
 *
 * Fase 1: localStorage + seed desde JSON mock.
 * Fase 2: sustituir esta implementación por llamadas a Supabase/API
 *         manteniendo la misma interfaz ExcepcionesRepository.
 */

import seedData from "@/data/excepciones.mock.json";
import type {
  Excepcion,
  ExcepcionFilters,
  EventoAuditoria,
  NuevaExcepcionInput,
  EstadoExcepcion,
} from "@/types/excepcion";
import { ACTOR_OTS_ACTUAL } from "@/types/excepcion";
import {
  ahoraISO,
  formatearFecha,
  generarIdEvento,
  generarSiguienteId,
  hoyISO,
  sumarDiasISO,
} from "@/lib/excepciones/utils";

const STORAGE_KEY = "gestor-excepciones:v2";

export interface AmpliarInput {
  nuevaFechaRevision: string;
  motivo: string;
  actorEmail?: string;
}

export interface DecisionInput {
  motivo?: string;
  actorEmail?: string;
}

export interface ReactivarInput {
  nuevaFechaRevision: string;
  motivo?: string;
  actorEmail?: string;
}

export interface ExcepcionesRepository {
  list(filters?: ExcepcionFilters): Promise<Excepcion[]>;
  getById(id: string): Promise<Excepcion | null>;
  create(input: NuevaExcepcionInput): Promise<Excepcion>;
  update(id: string, patch: Partial<Excepcion>): Promise<Excepcion>;
  aprobar(id: string, input?: DecisionInput): Promise<Excepcion>;
  rechazar(id: string, input?: DecisionInput): Promise<Excepcion>;
  cancelar(id: string, input?: DecisionInput): Promise<Excepcion>;
  ampliar(id: string, input: AmpliarInput): Promise<Excepcion>;
  reactivar(id: string, input: ReactivarInput): Promise<Excepcion>;
  resetToSeed(): Promise<Excepcion[]>;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function normalize(exc: Excepcion): Excepcion {
  return {
    ...exc,
    aprobador_email: exc.aprobador_email ?? null,
    fecha_decision: exc.fecha_decision ?? null,
    control_compensatorio: exc.control_compensatorio ?? "",
    historial: Array.isArray(exc.historial) ? exc.historial : [],
  };
}

function readAll(): Excepcion[] {
  if (!isBrowser()) {
    return (structuredClone(seedData) as Excepcion[]).map(normalize);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = (structuredClone(seedData) as Excepcion[]).map(normalize);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }

  try {
    return (JSON.parse(raw) as Excepcion[]).map(normalize);
  } catch {
    const seed = (structuredClone(seedData) as Excepcion[]).map(normalize);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
}

function writeAll(excepciones: Excepcion[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(excepciones));
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
        item.origen_peticion,
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

function appendEvento(
  excepcion: Excepcion,
  evento: Omit<EventoAuditoria, "id" | "timestamp"> & {
    timestamp?: string;
  }
): Excepcion {
  const entry: EventoAuditoria = {
    id: generarIdEvento(excepcion.id, excepcion.historial.length),
    timestamp: evento.timestamp ?? ahoraISO(),
    tipo: evento.tipo,
    actor_email: evento.actor_email,
    detalle: evento.detalle,
    estado_anterior: evento.estado_anterior,
    estado_nuevo: evento.estado_nuevo,
  };

  return {
    ...excepcion,
    historial: [entry, ...excepcion.historial],
  };
}

function saveUpdated(updated: Excepcion): Excepcion {
  const all = readAll();
  const index = all.findIndex((e) => e.id === updated.id);
  if (index === -1) {
    throw new Error(`Excepción no encontrada: ${updated.id}`);
  }
  all[index] = updated;
  writeAll(all);
  return updated;
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

/** Implementación Fase 1 — localStorage. En Fase 2: SupabaseExcepcionesRepository. */
export const localExcepcionesRepository: ExcepcionesRepository = {
  async list(filters) {
    return applyFilters(readAll(), filters);
  },

  async getById(id) {
    return readAll().find((e) => e.id === id) ?? null;
  },

  async create(input) {
    const all = readAll();
    const id = generarSiguienteId(all);
    const estado = input.estado ?? "Pendiente";
    const solicitante = input.solicitante_email.trim();

    let nueva: Excepcion = {
      tipo_excepcion: input.tipo_excepcion,
      origen_peticion: input.origen_peticion.trim(),
      solicitante_email: solicitante,
      activo_afectado: input.activo_afectado.trim(),
      justificacion: input.justificacion.trim(),
      control_compensatorio: input.control_compensatorio?.trim() ?? "",
      estado,
      temporalidad: input.temporalidad,
      fecha_revision: input.fecha_revision,
      id,
      fecha_solicitud: input.fecha_solicitud ?? hoyISO(),
      aprobador_email: input.aprobador_email ?? null,
      fecha_decision: input.fecha_decision ?? null,
      historial: [],
    };

    nueva = appendEvento(nueva, {
      tipo: "Creada",
      actor_email: solicitante || ACTOR_OTS_ACTUAL,
      detalle: "Alta de excepción de seguridad.",
      estado_anterior: null,
      estado_nuevo: estado,
    });

    all.unshift(nueva);
    writeAll(all);
    return nueva;
  },

  async update(id, patch) {
    const current = await this.getById(id);
    if (!current) throw new Error(`Excepción no encontrada: ${id}`);
    const updated = normalize({ ...current, ...patch, id });
    return saveUpdated(updated);
  },

  async aprobar(id, input = {}) {
    const current = await this.getById(id);
    if (!current) throw new Error(`Excepción no encontrada: ${id}`);
    requireEstado(current, ["Pendiente"], "aprobar");

    const actor = input.actorEmail ?? ACTOR_OTS_ACTUAL;
    let updated = appendEvento(current, {
      tipo: "Aprobada",
      actor_email: actor,
      detalle: input.motivo?.trim() || "Excepción aprobada por OTS.",
      estado_anterior: current.estado,
      estado_nuevo: "Aprobada",
    });
    updated = {
      ...updated,
      estado: "Aprobada",
      aprobador_email: actor,
      fecha_decision: hoyISO(),
    };
    return saveUpdated(updated);
  },

  async rechazar(id, input = {}) {
    const current = await this.getById(id);
    if (!current) throw new Error(`Excepción no encontrada: ${id}`);
    requireEstado(current, ["Pendiente"], "rechazar");

    const actor = input.actorEmail ?? ACTOR_OTS_ACTUAL;
    let updated = appendEvento(current, {
      tipo: "Rechazada",
      actor_email: actor,
      detalle: input.motivo?.trim() || "Excepción rechazada por OTS.",
      estado_anterior: current.estado,
      estado_nuevo: "Rechazada",
    });
    updated = {
      ...updated,
      estado: "Rechazada",
      aprobador_email: actor,
      fecha_decision: hoyISO(),
    };
    return saveUpdated(updated);
  },

  async cancelar(id, input = {}) {
    const current = await this.getById(id);
    if (!current) throw new Error(`Excepción no encontrada: ${id}`);
    requireEstado(current, ["Aprobada", "Pendiente"], "cancelar");

    const actor = input.actorEmail ?? ACTOR_OTS_ACTUAL;
    let updated = appendEvento(current, {
      tipo: "Cancelada",
      actor_email: actor,
      detalle: input.motivo?.trim() || "Excepción cancelada.",
      estado_anterior: current.estado,
      estado_nuevo: "Cancelada",
    });
    updated = {
      ...updated,
      estado: "Cancelada",
    };
    return saveUpdated(updated);
  },

  async ampliar(id, input) {
    const current = await this.getById(id);
    if (!current) throw new Error(`Excepción no encontrada: ${id}`);
    requireEstado(current, ["Aprobada"], "ampliar");

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

    let updated = appendEvento(current, {
      tipo: "Ampliada",
      actor_email: actor,
      detalle: `Ampliación de revisión del ${anterior} al ${nueva}. ${input.motivo.trim()}`,
      estado_anterior: current.estado,
      estado_nuevo: "Aprobada",
    });
    updated = {
      ...updated,
      fecha_revision: input.nuevaFechaRevision,
    };
    return saveUpdated(updated);
  },

  async reactivar(id, input) {
    const current = await this.getById(id);
    if (!current) throw new Error(`Excepción no encontrada: ${id}`);
    requireEstado(
      current,
      ["Cancelada", "Caducada", "Rechazada"],
      "reactivar"
    );

    if (!input.nuevaFechaRevision) {
      throw new Error("Indica la nueva fecha de revisión.");
    }

    const actor = input.actorEmail ?? ACTOR_OTS_ACTUAL;
    let updated = appendEvento(current, {
      tipo: "Reactivada",
      actor_email: actor,
      detalle:
        input.motivo?.trim() ||
        `Reactivada con revisión ${formatearFecha(input.nuevaFechaRevision)}.`,
      estado_anterior: current.estado,
      estado_nuevo: "Aprobada",
    });
    updated = {
      ...updated,
      estado: "Aprobada",
      fecha_revision: input.nuevaFechaRevision,
      aprobador_email: actor,
      fecha_decision: hoyISO(),
    };
    return saveUpdated(updated);
  },

  async resetToSeed() {
    const seed = (structuredClone(seedData) as Excepcion[]).map(normalize);
    writeAll(seed);
    return seed;
  },
};

export const excepcionesRepository: ExcepcionesRepository =
  localExcepcionesRepository;

/** Helper para UI: fecha por defecto al ampliar (+30 días). */
export function fechaAmpliacionPorDefecto(fechaActual: string): string {
  return sumarDiasISO(fechaActual, 30);
}
