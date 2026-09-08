import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  parseISO,
} from "date-fns";
import type { Excepcion, Temporalidad } from "@/types/excepcion";

/** Días restantes hasta fecha_revision (negativo si ya pasó). */
export function diasHastaRevision(
  fechaRevision: string,
  desde: Date = new Date()
): number {
  return differenceInCalendarDays(parseISO(fechaRevision), desde);
}

/** Excepciones activas (pendientes o aprobadas, aún dentro de vigencia). */
export function esActiva(excepcion: Excepcion): boolean {
  return excepcion.estado === "Pendiente" || excepcion.estado === "Aprobada";
}

/**
 * Si está Pendiente/Aprobada y ya pasó la fecha de revisión,
 * debe tratarse como Caducada (pendiente de revisar).
 */
export function debeEstarCaducada(
  excepcion: Pick<Excepcion, "estado" | "fecha_revision">,
  hoy: string = hoyISO()
): boolean {
  return (
    (excepcion.estado === "Pendiente" || excepcion.estado === "Aprobada") &&
    excepcion.fecha_revision < hoy
  );
}

/** Revisión dentro de los próximos N días, o ya caducada. */
export function requiereAtencionRevision(
  excepcion: Excepcion,
  ventanaDias = 14,
  desde: Date = new Date()
): boolean {
  if (excepcion.estado === "Caducada") return true;
  if (!esActiva(excepcion)) return false;
  const dias = diasHastaRevision(excepcion.fecha_revision, desde);
  return dias <= ventanaDias;
}

export function formatearFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  if (!y || !m || !d) return fecha;
  return `${d}/${m}/${y}`;
}

export function formatearFechaHora(iso: string): string {
  try {
    const date = parseISO(iso);
    return format(date, "dd/MM/yyyy HH:mm");
  } catch {
    return iso;
  }
}

export function hoyISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function ahoraISO(): string {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");
}

export function sumarDiasISO(fecha: string, dias: number): string {
  return format(addDays(parseISO(fecha), dias), "yyyy-MM-dd");
}

export function sumarMesesISO(fecha: string, meses: number): string {
  return format(addMonths(parseISO(fecha), meses), "yyyy-MM-dd");
}

/** Fecha de revisión por defecto: Temporal = +6 meses; Permanente = +12 meses. */
export function fechaRevisionPorDefecto(
  temporalidad: Temporalidad,
  desde: string = hoyISO()
): string {
  return sumarMesesISO(desde, temporalidad === "Temporal" ? 6 : 12);
}

/** Helper UI: fecha por defecto al ampliar (+30 días). */
export function fechaAmpliacionPorDefecto(fechaActual: string): string {
  return sumarDiasISO(fechaActual, 30);
}

export function generarSiguienteId(excepciones: { id: string }[]): string {
  const prefix = "EXC-CIB-";
  let max = 0;

  for (const exc of excepciones) {
    if (!exc.id.startsWith(prefix)) continue;
    const n = Number.parseInt(exc.id.slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }

  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function generarIdEvento(excepcionId: string, historialLength: number): string {
  return `aud-${excepcionId}-${historialLength + 1}-${Date.now().toString(36)}`;
}
