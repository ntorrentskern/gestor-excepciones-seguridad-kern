/**
 * Migración: columna is_sandbox en excepciones y sujetos.
 * Uso: npm run db:migrate:sandbox
 */
import { neon } from "@neondatabase/serverless";

const databaseUrl =
  process.env.DATABASE_URL ?? process.env.STORAGE_DATABASE_URL;

if (!databaseUrl) {
  console.error("Falta DATABASE_URL o STORAGE_DATABASE_URL");
  process.exit(1);
}

const sql = neon(databaseUrl);

console.log("→ Migración sandbox (is_sandbox)…");

await sql`
  ALTER TABLE excepciones
  ADD COLUMN IF NOT EXISTS is_sandbox BOOLEAN NOT NULL DEFAULT FALSE
`;

await sql`
  ALTER TABLE sujetos
  ADD COLUMN IF NOT EXISTS is_sandbox BOOLEAN NOT NULL DEFAULT FALSE
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_excepciones_sandbox
  ON excepciones (is_sandbox)
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_sujetos_sandbox
  ON sujetos (is_sandbox)
`;

const exc = await sql`
  SELECT count(*) FILTER (WHERE is_sandbox)::int AS sandbox,
         count(*) FILTER (WHERE NOT is_sandbox)::int AS real
  FROM excepciones
`;
const suj = await sql`
  SELECT count(*) FILTER (WHERE is_sandbox)::int AS sandbox,
         count(*) FILTER (WHERE NOT is_sandbox)::int AS real
  FROM sujetos
`;

console.log(
  `OK excepciones: sandbox=${exc[0]?.sandbox ?? 0} real=${exc[0]?.real ?? 0}`
);
console.log(
  `OK sujetos: sandbox=${suj[0]?.sandbox ?? 0} real=${suj[0]?.real ?? 0}`
);
