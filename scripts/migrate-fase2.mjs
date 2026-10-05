/**
 * Migración Fase 2: sujetos + vínculo con excepciones.
 * Idempotente. Incluye backfill desde activo_afectado / solicitante_email.
 *
 * Uso: npm run db:migrate:fase2
 */
import { neon } from "@neondatabase/serverless";
import { randomBytes } from "node:crypto";

const databaseUrl =
  process.env.DATABASE_URL ?? process.env.STORAGE_DATABASE_URL;

if (!databaseUrl) {
  console.error("Falta DATABASE_URL o STORAGE_DATABASE_URL");
  process.exit(1);
}

const sql = neon(databaseUrl);

function normalizeClave(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function guessTipo(clave) {
  const v = clave.toLowerCase();
  if (v.includes("@")) return "usuario";
  // PC, servidor, IP, dispositivo… → activo
  return "activo";
}

function newId(prefix) {
  return `${prefix}-${randomBytes(5).toString("hex")}`;
}

console.log("→ Migración Fase 2…");

await sql`
  CREATE TABLE IF NOT EXISTS sujetos (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL
      CHECK (tipo IN ('usuario', 'activo', 'otro')),
    clave TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    notas TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

await sql`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_sujetos_tipo_clave
  ON sujetos (tipo, lower(clave))
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_sujetos_clave_lower
  ON sujetos (lower(clave))
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_sujetos_display_lower
  ON sujetos (lower(display_name))
`;

console.log("OK tabla sujetos");

await sql`
  CREATE TABLE IF NOT EXISTS excepcion_sujeto (
    excepcion_id TEXT NOT NULL REFERENCES excepciones (id) ON DELETE CASCADE,
    sujeto_id TEXT NOT NULL REFERENCES sujetos (id) ON DELETE CASCADE,
    rol_vinculo TEXT NOT NULL DEFAULT 'afectado',
    PRIMARY KEY (excepcion_id, sujeto_id)
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_excepcion_sujeto_sujeto
  ON excepcion_sujeto (sujeto_id)
`;

console.log("OK tabla excepcion_sujeto");

// Backfill: crear sujetos a partir de datos existentes y vincular
const rows = await sql`
  SELECT id, solicitante_email, activo_afectado
  FROM excepciones
`;

let created = 0;
let linked = 0;

for (const row of rows) {
  const candidates = [];

  const email = normalizeClave(row.solicitante_email);
  if (email) {
    candidates.push({
      tipo: "usuario",
      clave: email,
      display_name: row.solicitante_email.trim(),
    });
  }

  const activo = String(row.activo_afectado ?? "").trim();
  if (activo) {
    // Separar por ; , | o " y "
    const parts = activo
      .split(/\s*[;|,]\s*|\s+y\s+/i)
      .map((p) => p.trim())
      .filter(Boolean);
    for (const part of parts.length ? parts : [activo]) {
      const clave = normalizeClave(part);
      if (!clave) continue;
      candidates.push({
        tipo: guessTipo(clave),
        clave,
        display_name: part,
      });
    }
  }

  for (const c of candidates) {
    const existing = await sql`
      SELECT id FROM sujetos
      WHERE tipo = ${c.tipo} AND lower(clave) = ${c.clave}
      LIMIT 1
    `;

    let sujetoId;
    if (existing[0]) {
      sujetoId = existing[0].id;
    } else {
      sujetoId = newId("suj");
      await sql`
        INSERT INTO sujetos (id, tipo, clave, display_name, notas)
        VALUES (${sujetoId}, ${c.tipo}, ${c.clave}, ${c.display_name}, ${""})
      `;
      created += 1;
    }

    const link = await sql`
      INSERT INTO excepcion_sujeto (excepcion_id, sujeto_id, rol_vinculo)
      VALUES (${row.id}, ${sujetoId}, ${"afectado"})
      ON CONFLICT DO NOTHING
      RETURNING excepcion_id
    `;
    if (link.length) linked += 1;
  }
}

const sujetosCount = await sql`SELECT count(*)::int AS n FROM sujetos`;
const linksCount = await sql`SELECT count(*)::int AS n FROM excepcion_sujeto`;

console.log(
  `Backfill: +${created} sujetos, +${linked} vínculos (totales: ${sujetosCount[0].n} sujetos, ${linksCount[0].n} links)`
);
console.log("\nMigración Fase 2 completada.");
