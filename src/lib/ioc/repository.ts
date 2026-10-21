import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import {
  isValidIocValor,
  normalizeIocValor,
  type Ioc,
  type IocInput,
  type IocStats,
  type TipoIoc,
} from "@/types/ioc";

type IocRow = {
  id: string;
  tipo: string;
  valor: string;
  notas: string;
  fuente: string;
  activo: boolean;
  created_at: string | Date;
  updated_at: string | Date;
};

function toIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapIoc(row: IocRow): Ioc {
  return {
    id: row.id,
    tipo: row.tipo as TipoIoc,
    valor: row.valor,
    notas: row.notas ?? "",
    fuente: row.fuente ?? "",
    activo: Boolean(row.activo),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

function newId(): string {
  return `ioc-${randomBytes(5).toString("hex")}`;
}

export async function listIocs(
  tipo: TipoIoc,
  opts?: { q?: string; soloActivos?: boolean }
): Promise<Ioc[]> {
  const q = opts?.q?.trim().toLowerCase() ?? "";
  const pattern = q ? `%${q}%` : null;
  const soloActivos = Boolean(opts?.soloActivos);

  const rows = (await sql`
    SELECT id, tipo, valor, notas, fuente, activo, created_at, updated_at
    FROM iocs
    WHERE tipo = ${tipo}
      AND (${soloActivos} = FALSE OR activo = TRUE)
      AND (
        ${pattern}::text IS NULL
        OR lower(valor) LIKE ${pattern}
        OR lower(notas) LIKE ${pattern}
        OR lower(fuente) LIKE ${pattern}
      )
    ORDER BY activo DESC, lower(valor) ASC
  `) as IocRow[];

  return rows.map(mapIoc);
}

export async function getIocById(id: string): Promise<Ioc | null> {
  const rows = (await sql`
    SELECT id, tipo, valor, notas, fuente, activo, created_at, updated_at
    FROM iocs WHERE id = ${id} LIMIT 1
  `) as IocRow[];
  return rows[0] ? mapIoc(rows[0]) : null;
}

export async function createIoc(
  tipo: TipoIoc,
  input: IocInput
): Promise<Ioc> {
  const valor = normalizeIocValor(tipo, input.valor);
  if (!isValidIocValor(tipo, valor)) {
    throw new Error(
      tipo === "ip"
        ? "IP no válida (IPv4/IPv6 o CIDR)."
        : "Dominio no válido."
    );
  }

  const id = newId();
  const notas = input.notas?.trim() ?? "";
  const fuente = input.fuente?.trim() ?? "";
  const activo = input.activo !== false;

  try {
    await sql`
      INSERT INTO iocs (id, tipo, valor, notas, fuente, activo)
      VALUES (${id}, ${tipo}, ${valor}, ${notas}, ${fuente}, ${activo})
    `;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("idx_iocs_tipo_valor") || msg.includes("unique")) {
      throw new Error(`Ya existe «${valor}» en la lista.`);
    }
    throw err;
  }

  const created = await getIocById(id);
  if (!created) throw new Error("No se pudo crear el IOC.");
  return created;
}

export async function updateIoc(
  id: string,
  input: IocInput & { tipo?: TipoIoc }
): Promise<Ioc> {
  const current = await getIocById(id);
  if (!current) throw new Error("IOC no encontrado.");

  const tipo = input.tipo ?? current.tipo;
  const valor = normalizeIocValor(tipo, input.valor);
  if (!isValidIocValor(tipo, valor)) {
    throw new Error(
      tipo === "ip"
        ? "IP no válida (IPv4/IPv6 o CIDR)."
        : "Dominio no válido."
    );
  }

  const notas = input.notas?.trim() ?? "";
  const fuente = input.fuente?.trim() ?? "";
  const activo = input.activo !== false;

  try {
    await sql`
      UPDATE iocs
      SET valor = ${valor},
          notas = ${notas},
          fuente = ${fuente},
          activo = ${activo},
          updated_at = NOW()
      WHERE id = ${id}
    `;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("idx_iocs_tipo_valor") || msg.includes("unique")) {
      throw new Error(`Ya existe «${valor}» en la lista.`);
    }
    throw err;
  }

  const updated = await getIocById(id);
  if (!updated) throw new Error("No se pudo actualizar el IOC.");
  return updated;
}

export async function deleteIoc(id: string): Promise<void> {
  await sql`DELETE FROM iocs WHERE id = ${id}`;
}

export async function deleteIocsByIds(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const result = await sql`
    DELETE FROM iocs WHERE id = ANY(${ids})
  `;
  return Array.isArray(result) ? result.length : ids.length;
}

export type BulkImportResult = {
  created: number;
  skipped: number;
  invalid: string[];
};

export async function bulkImportIocs(
  tipo: TipoIoc,
  valores: string[],
  opts?: { fuente?: string; activo?: boolean }
): Promise<BulkImportResult> {
  const fuente = opts?.fuente?.trim() ?? "import";
  const activo = opts?.activo !== false;
  let created = 0;
  let skipped = 0;
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const raw of valores) {
    const valor = normalizeIocValor(tipo, raw);
    if (!valor || !isValidIocValor(tipo, valor)) {
      invalid.push(raw.trim());
      continue;
    }
    const key = valor.toLowerCase();
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);

    const existing = (await sql`
      SELECT id FROM iocs
      WHERE tipo = ${tipo} AND lower(valor) = ${key}
      LIMIT 1
    `) as Array<{ id: string }>;

    if (existing[0]) {
      skipped += 1;
      continue;
    }

    await sql`
      INSERT INTO iocs (id, tipo, valor, notas, fuente, activo)
      VALUES (${newId()}, ${tipo}, ${valor}, ${""}, ${fuente}, ${activo})
    `;
    created += 1;
  }

  return { created, skipped, invalid };
}

export async function listFeedValores(tipo: TipoIoc): Promise<string[]> {
  const rows = (await sql`
    SELECT valor FROM iocs
    WHERE tipo = ${tipo} AND activo = TRUE
    ORDER BY lower(valor) ASC
  `) as Array<{ valor: string }>;
  return rows.map((r) => r.valor);
}

export async function getIocStats(): Promise<IocStats> {
  const rows = (await sql`
    SELECT
      count(*) FILTER (WHERE tipo = 'ip')::int AS ips,
      count(*) FILTER (WHERE tipo = 'dominio')::int AS dominios,
      count(*) FILTER (WHERE tipo = 'ip' AND activo)::int AS ips_activas,
      count(*) FILTER (WHERE tipo = 'dominio' AND activo)::int AS dominios_activos
    FROM iocs
  `) as Array<{
    ips: number;
    dominios: number;
    ips_activas: number;
    dominios_activos: number;
  }>;

  const r = rows[0];
  return {
    ips: Number(r?.ips) || 0,
    dominios: Number(r?.dominios) || 0,
    ipsActivas: Number(r?.ips_activas) || 0,
    dominiosActivos: Number(r?.dominios_activos) || 0,
  };
}
