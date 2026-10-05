/**
 * Si viene de un usuario → usuario afectado + vínculo usuario.
 * Si viene de un activo → equipo afectado + vínculo activo.
 */
import type { Sujeto, TipoSujeto } from "@/types/sujeto";
import { isTipoSujeto, normalizeTipoSujeto } from "@/types/sujeto";

/** URL de alta prellenada desde una ficha de usuario/activo. */
export function buildNuevaExcepcionRelacionadaHref(sujeto: {
  tipo: TipoSujeto;
  clave: string;
  display_name: string;
}): string {
  const params = new URLSearchParams({
    tipo: sujeto.tipo,
    clave: sujeto.clave,
    display: sujeto.display_name || sujeto.clave,
  });
  return `/excepciones/nueva?${params.toString()}`;
}

export function parseVinculoFromSearchParams(
  searchParams: { get(name: string): string | null },
  suggestTipo: (clave: string) => TipoSujeto
): {
  tipo: TipoSujeto | null;
  clave: string;
  display: string;
} {
  const clave =
    searchParams.get("clave")?.trim() ||
    searchParams.get("activo")?.trim() ||
    "";
  const display =
    searchParams.get("display")?.trim() ||
    searchParams.get("activo")?.trim() ||
    clave;
  const tipoRaw = searchParams.get("tipo")?.trim() ?? "";
  const tipo = isTipoSujeto(tipoRaw)
    ? tipoRaw
    : tipoRaw
      ? normalizeTipoSujeto(tipoRaw)
      : clave
        ? suggestTipo(clave)
        : null;

  return { tipo, clave, display };
}

export function prefillFromVinculo(input: {
  tipo: TipoSujeto | null;
  clave: string;
  display: string;
  suggestTipo: (clave: string) => TipoSujeto;
}): {
  solicitante_email: string;
  activo_afectado: string;
  sujetos: Array<{
    tipo: TipoSujeto;
    clave: string;
    display_name: string;
    auto?: boolean;
  }>;
} {
  const clave = input.clave.trim();
  const display = (input.display || clave).trim();
  if (!clave) {
    return { solicitante_email: "", activo_afectado: "", sujetos: [] };
  }

  const tipo = normalizeTipoSujeto(
    input.tipo ?? input.suggestTipo(clave)
  );

  if (tipo === "usuario") {
    return {
      solicitante_email: display,
      activo_afectado: "",
      sujetos: [{ tipo: "usuario", clave, display_name: display, auto: true }],
    };
  }

  return {
    solicitante_email: "",
    activo_afectado: display,
    sujetos: [{ tipo: "activo", clave, display_name: display, auto: true }],
  };
}

export function labelFromSujeto(sujeto: Pick<Sujeto, "tipo" | "display_name">) {
  return sujeto.display_name;
}
