/**
 * Migración: tabla iocs (IPs / dominios maliciosos para feeds FW).
 * Idempotente.
 *
 * Uso: npm run db:migrate:ioc
 */
import { neon } from "@neondatabase/serverless";

const databaseUrl =
  process.env.DATABASE_URL ?? process.env.STORAGE_DATABASE_URL;

if (!databaseUrl) {
  console.error("Falta DATABASE_URL o STORAGE_DATABASE_URL");
  process.exit(1);
}

const sql = neon(databaseUrl);

console.log("→ Migración IOC (iocs)…");

await sql`
  CREATE TABLE IF NOT EXISTS iocs (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL
      CHECK (tipo IN ('ip', 'dominio')),
    valor TEXT NOT NULL,
    notas TEXT NOT NULL DEFAULT '',
    fuente TEXT NOT NULL DEFAULT '',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

await sql`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_iocs_tipo_valor
    ON iocs (tipo, lower(valor))
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_iocs_tipo_activo
    ON iocs (tipo, activo)
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_iocs_valor_lower
    ON iocs (lower(valor))
`;

const count = await sql`SELECT count(*)::int AS n FROM iocs`;
console.log(`OK: tabla iocs lista (${count[0]?.n ?? 0} filas).`);
