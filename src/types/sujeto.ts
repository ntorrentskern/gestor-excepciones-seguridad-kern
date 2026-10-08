export const TIPOS_SUJETO = ["usuario", "activo", "otro"] as const;

export type TipoSujeto = (typeof TIPOS_SUJETO)[number];

export const TIPO_SUJETO_LABELS: Record<TipoSujeto, string> = {
  usuario: "Usuario",
  activo: "Activo",
  otro: "Otro",
};

/** Etiqueta genérica en UI (evitamos la palabra «sujeto»). */
export const VINCULADOS_LABEL = "Vínculos";
export const VINCULADO_LABEL = "Usuario / activo";

export function isTipoSujeto(value: string): value is TipoSujeto {
  return (TIPOS_SUJETO as readonly string[]).includes(value);
}

/** Normaliza tipos antiguos (pc, servidor…) al modelo Usuario / Activo / Otro. */
export function normalizeTipoSujeto(value: string): TipoSujeto {
  if (value === "usuario") return "usuario";
  if (value === "otro") return "otro";
  if (value === "activo") return "activo";
  // legacy
  if (
    value === "pc" ||
    value === "dispositivo" ||
    value === "servidor" ||
    value === "cuenta"
  ) {
    return "activo";
  }
  return isTipoSujeto(value) ? value : "otro";
}

export type Sujeto = {
  id: string;
  tipo: TipoSujeto;
  /** Clave normalizada para búsqueda (email, hostname, etc.). */
  clave: string;
  display_name: string;
  notas: string;
  /** true = dato del entorno de demostración (aislado). */
  is_sandbox?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type SujetoInput = {
  tipo: TipoSujeto;
  clave: string;
  display_name?: string;
  notas?: string;
  /** Generado desde Usuario/Equipo afectados (no se elimina a mano). */
  auto?: boolean;
  /** true = crear / buscar en entorno de demostración. */
  is_sandbox?: boolean;
};

export type SujetoConStats = Sujeto & {
  total_excepciones: number;
  activas: number;
  pendientes: number;
};

export type GlobalSearchResult = {
  query: string;
  sujetos: SujetoConStats[];
  excepciones: Array<{
    id: string;
    dominio: string;
    tipo_excepcion: string;
    estado: string;
    solicitante_email: string;
    activo_afectado: string;
  }>;
};

/** Parte equipos separados por ; , | o " y ". */
export function splitActivos(raw: string): string[] {
  return raw
    .split(/\s*[;|,]\s*|\s+y\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Une vínculos automáticos (usuario + equipo) con los manuales («Otro» u extras).
 */
export function mergeSujetosAutoManual(input: {
  usuarioAfectado: string;
  equipoAfectado: string;
  manual: SujetoInput[];
}): SujetoInput[] {
  const auto: SujetoInput[] = [];
  const usuario = input.usuarioAfectado.trim();
  if (usuario) {
    auto.push({
      tipo: "usuario",
      clave: usuario,
      display_name: usuario,
      auto: true,
    });
  }
  for (const part of splitActivos(input.equipoAfectado)) {
    auto.push({
      tipo: "activo",
      clave: part,
      display_name: part,
      auto: true,
    });
  }

  const autoKeys = new Set(
    auto.map((s) => `${s.tipo}:${s.clave.trim().toLowerCase()}`)
  );

  const manual = input.manual
    .filter((s) => s.clave.trim())
    .filter(
      (s) => !autoKeys.has(`${s.tipo}:${s.clave.trim().toLowerCase()}`)
    )
    .map((s) => ({ ...s, auto: false as const }));

  return [...auto, ...manual];
}
