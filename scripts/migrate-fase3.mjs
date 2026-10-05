/**
 * Migración Fase 3: eventos operativos (baja / cambio dispositivo).
 * Uso: npm run db:migrate:fase3
 */
import { neon } from "@neondatabase/serverless";

const databaseUrl =
  process.env.DATABASE_URL ?? process.env.STORAGE_DATABASE_URL;

if (!databaseUrl) {
  console.error("Falta DATABASE_URL o STORAGE_DATABASE_URL");
  process.exit(1);
}

const sql = neon(databaseUrl);

console.log("→ Migración Fase 3…");

await sql`
  CREATE TABLE IF NOT EXISTS eventos_operativos (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL
      CHECK (tipo IN ('BajaUsuario', 'CambioDispositivo')),
    sujeto_id TEXT NOT NULL REFERENCES sujetos (id) ON DELETE CASCADE,
    actor_email TEXT NOT NULL,
    notas TEXT NOT NULL DEFAULT '',
    estado TEXT NOT NULL DEFAULT 'Abierto'
      CHECK (estado IN ('Abierto', 'Cerrado')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_eventos_operativos_sujeto
  ON eventos_operativos (sujeto_id)
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_eventos_operativos_estado
  ON eventos_operativos (estado)
`;

await sql`
  CREATE TABLE IF NOT EXISTS evento_operativo_excepcion (
    evento_id TEXT NOT NULL REFERENCES eventos_operativos (id) ON DELETE CASCADE,
    excepcion_id TEXT NOT NULL REFERENCES excepciones (id) ON DELETE CASCADE,
    revisada BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (evento_id, excepcion_id)
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_evento_op_exc_excepcion
  ON evento_operativo_excepcion (excepcion_id)
`;

console.log("OK eventos_operativos + vínculos");
console.log("\nMigración Fase 3 completada.");
