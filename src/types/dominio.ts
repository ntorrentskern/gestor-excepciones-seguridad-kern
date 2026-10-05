/** Dominios IT que gestionan excepciones. */
export const DOMINIOS = ["seguridad", "sistemas", "helpdesk"] as const;
export type Dominio = (typeof DOMINIOS)[number];

export const DOMINIO_LABELS: Record<Dominio, string> = {
  seguridad: "Seguridad",
  sistemas: "Sistemas",
  helpdesk: "Helpdesk",
};

export const DOMINIO_PREFIX: Record<Dominio, string> = {
  seguridad: "EXC-SEG-",
  sistemas: "EXC-SIS-",
  helpdesk: "EXC-HD-",
};

/** Prefijos históricos / alias al leer IDs antiguos. */
export const DOMINIO_PREFIX_ALIASES: Record<Dominio, string[]> = {
  seguridad: ["EXC-SEG-", "EXC-CIB-"],
  sistemas: ["EXC-SIS-"],
  helpdesk: ["EXC-HD-"],
};

export const TIPOS_SEGURIDAD = [
  "Dispositivo USB",
  "Acceso herramientas IA",
  "Instalación de software",
  "Acceso privilegiado",
  "Exclusión de EDR / Antivirus",
  "Acceso web excepcional",
  "Configuración técnica excepcional",
  "Otra",
] as const;

export const TIPOS_SISTEMAS = [
  "Firewall / regla FW",
  "VPN",
  "Acceso privilegiado infra",
  "Servidor",
  "OT / industrial",
  "Azure / cloud",
  "Cuenta de servicio",
  "Otra infra",
] as const;

export const TIPOS_HELPDESK = [
  "Préstamo / dispositivo temporal",
  "Acceso local",
  "Software de soporte",
  "Cambio de dispositivo",
  "Otra endpoint",
] as const;

export const TIPOS_POR_DOMINIO = {
  seguridad: TIPOS_SEGURIDAD,
  sistemas: TIPOS_SISTEMAS,
  helpdesk: TIPOS_HELPDESK,
} as const;

export type TipoExcepcionSeguridad = (typeof TIPOS_SEGURIDAD)[number];
export type TipoExcepcionSistemas = (typeof TIPOS_SISTEMAS)[number];
export type TipoExcepcionHelpdesk = (typeof TIPOS_HELPDESK)[number];

export type TipoExcepcion =
  | TipoExcepcionSeguridad
  | TipoExcepcionSistemas
  | TipoExcepcionHelpdesk;

/** Todos los tipos (unión) para validaciones y filtros globales. */
export const TIPOS_EXCEPCION = [
  ...TIPOS_SEGURIDAD,
  ...TIPOS_SISTEMAS,
  ...TIPOS_HELPDESK,
] as const;

export const TIPOS_EXCEPCION_CORTO: Record<TipoExcepcion, string> = {
  "Dispositivo USB": "USB",
  "Acceso herramientas IA": "Uso IA",
  "Instalación de software": "Software",
  "Acceso privilegiado": "Privilegiado",
  "Exclusión de EDR / Antivirus": "EDR",
  "Acceso web excepcional": "Acceso web",
  "Configuración técnica excepcional": "Config. técnica",
  Otra: "Otra",
  "Firewall / regla FW": "FW",
  VPN: "VPN",
  "Acceso privilegiado infra": "Priv. infra",
  Servidor: "Servidor",
  "OT / industrial": "OT",
  "Azure / cloud": "Azure",
  "Cuenta de servicio": "Svc",
  "Otra infra": "Otra infra",
  "Préstamo / dispositivo temporal": "Préstamo",
  "Acceso local": "Acceso local",
  "Software de soporte": "Soporte SW",
  "Cambio de dispositivo": "Cambio PC",
  "Otra endpoint": "Otra EP",
};

export function isDominio(value: string): value is Dominio {
  return (DOMINIOS as readonly string[]).includes(value);
}

export function tiposDeDominio(dominio: Dominio): readonly TipoExcepcion[] {
  return TIPOS_POR_DOMINIO[dominio] as readonly TipoExcepcion[];
}

export function dominioDeTipo(tipo: string): Dominio | null {
  for (const dominio of DOMINIOS) {
    if ((TIPOS_POR_DOMINIO[dominio] as readonly string[]).includes(tipo)) {
      return dominio;
    }
  }
  return null;
}

export function esTipoValidoParaDominio(
  tipo: string,
  dominio: Dominio
): boolean {
  return (TIPOS_POR_DOMINIO[dominio] as readonly string[]).includes(tipo);
}
