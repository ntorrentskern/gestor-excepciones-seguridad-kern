/** Helpers de sujetos seguros para componentes cliente (sin SQL). */

import type { TipoSujeto } from "@/types/sujeto";

export function suggestTipoSujeto(clave: string): TipoSujeto {
  const v = clave.trim().toLowerCase();
  if (!v) return "otro";
  if (v.includes("@")) return "usuario";
  // hostname, PC, IP, servidor, dispositivo… → activo
  if (
    /^pc[-_]?/i.test(v) ||
    /^laptop/i.test(v) ||
    /^srv[-_]?/i.test(v) ||
    /^server/i.test(v) ||
    /\.local$/i.test(v) ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(v) ||
    /iphone|android|tablet|movil|móvil|usb/i.test(v)
  ) {
    return "activo";
  }
  return "activo";
}
