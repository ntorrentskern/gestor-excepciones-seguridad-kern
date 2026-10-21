export const TIPOS_IOC = ["ip", "dominio"] as const;

export type TipoIoc = (typeof TIPOS_IOC)[number];

export const TIPO_IOC_LABELS: Record<TipoIoc, string> = {
  ip: "IP",
  dominio: "Dominio",
};

export function isTipoIoc(value: string): value is TipoIoc {
  return (TIPOS_IOC as readonly string[]).includes(value);
}

export type Ioc = {
  id: string;
  tipo: TipoIoc;
  valor: string;
  notas: string;
  fuente: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type IocInput = {
  valor: string;
  notas?: string;
  fuente?: string;
  activo?: boolean;
};

export type IocStats = {
  ips: number;
  dominios: number;
  ipsActivas: number;
  dominiosActivos: number;
};

/** Normaliza IP o dominio para unicidad. */
export function normalizeIocValor(tipo: TipoIoc, raw: string): string {
  let v = raw.trim();
  if (!v) return "";

  if (tipo === "dominio") {
    v = v.toLowerCase();
    v = v.replace(/^https?:\/\//, "");
    v = v.replace(/^www\./, "");
    // quitar path/query si pegaron URL completa
    v = v.split("/")[0] ?? v;
    v = v.split("?")[0] ?? v;
    v = v.replace(/\.$/, "");
    return v.slice(0, 253);
  }

  // IP: quitar espacios y corchetes IPv6
  v = v.replace(/^\[|\]$/g, "");
  // CIDR opcional se conserva
  return v.slice(0, 64);
}

/** Validación ligera (no exhaustiva). */
export function isValidIocValor(tipo: TipoIoc, valor: string): boolean {
  const v = normalizeIocValor(tipo, valor);
  if (!v) return false;
  if (tipo === "dominio") {
    // dominio o FQDN simple
    return /^(?:\*\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(
      v
    ) || /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(v);
  }
  // IPv4, IPv4/CIDR, IPv6 básico
  const ipv4 =
    /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?:\/(?:3[0-2]|[12]?\d))?$/;
  if (ipv4.test(v)) return true;
  // IPv6 laxo
  if (v.includes(":")) return /^[0-9a-fA-F:.]+(?:\/(?:12[0-8]|1[01]\d|\d{1,2}))?$/.test(v);
  return false;
}

/** Parte una lista bulk (líneas, comas, punto y coma). */
export function parseIocBulk(raw: string): string[] {
  return raw
    .split(/[\n\r,;]+/)
    .map((l) => l.trim())
    .map((l) => l.replace(/#.*$/, "").trim()) // comentarios
    .filter(Boolean);
}
