import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import type { Excepcion } from "@/types/excepcion";

/** Días restantes hasta fecha_revision (negativo si ya pasó). */
export function diasHastaRevision(
  fechaRevision: string,
  desde: Date = new Date()
): number {
  return differenceInCalendarDays(parseISO(fechaRevision), desde);
}

/** Excepciones activas (pendientes o aprobadas). */
export function esActiva(excepcion: Excepcion): boolean {
  return excepcion.estado === "Pendiente" || excepcion.estado === "Aprobada";
}

/** Revisión dentro de los próximos N días (incluye vencidas recientes). */
export function requiereAtencionRevision(
  excepcion: Excepcion,
  ventanaDias = 14,
  desde: Date = new Date()
): boolean {
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

export function generarSiguienteId(excepciones: Excepcion[]): string {
  const year = new Date().getFullYear();
  const prefix = `EXC-${year}-`;
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
