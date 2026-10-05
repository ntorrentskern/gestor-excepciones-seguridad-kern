/**
 * Migración Fase 1: dominio en excepciones + rol en usuarios.
 * Idempotente: se puede ejecutar varias veces.
 *
 * Uso: node --env-file=.env.local scripts/migrate-fase1.mjs
 */
import { neon } from "@neondatabase/serverless";

const databaseUrl =
  process.env.DATABASE_URL ?? process.env.STORAGE_DATABASE_URL;

if (!databaseUrl) {
  console.error("Falta DATABASE_URL o STORAGE_DATABASE_URL");
  process.exit(1);
}

const sql = neon(databaseUrl);

console.log("→ Migración Fase 1…");

await sql`
  ALTER TABLE excepciones
  ADD COLUMN IF NOT EXISTS dominio TEXT
`;

await sql`
  UPDATE excepciones
  SET dominio = 'seguridad'
  WHERE dominio IS NULL OR trim(dominio) = ''
`;

await sql`
  ALTER TABLE excepciones
  ALTER COLUMN dominio SET DEFAULT 'seguridad'
`;

await sql`
  ALTER TABLE excepciones
  ALTER COLUMN dominio SET NOT NULL
`;

// CHECK flexible: Neon/Postgres no permite IF NOT EXISTS en constraints fácilmente;
// se ignora si ya existe.
try {
  await sql`
    ALTER TABLE excepciones
    ADD CONSTRAINT excepciones_dominio_check
    CHECK (dominio IN ('seguridad', 'sistemas', 'helpdesk'))
  `;
  console.log("OK constraint dominio");
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("already exists") || msg.includes("excepciones_dominio_check")) {
    console.log("OK constraint dominio (ya existía)");
  } else {
    console.warn("Aviso constraint dominio:", msg);
  }
}

await sql`CREATE INDEX IF NOT EXISTS idx_excepciones_dominio ON excepciones (dominio)`;
console.log("OK excepciones.dominio");

await sql`
  ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS rol TEXT
`;

await sql`
  UPDATE usuarios
  SET rol = 'seguridad'
  WHERE rol IS NULL OR trim(rol) = ''
`;

await sql`
  ALTER TABLE usuarios
  ALTER COLUMN rol SET DEFAULT 'helpdesk'
`;

await sql`
  ALTER TABLE usuarios
  ALTER COLUMN rol SET NOT NULL
`;

try {
  await sql`
    ALTER TABLE usuarios
    ADD CONSTRAINT usuarios_rol_check
    CHECK (rol IN ('seguridad', 'sistemas', 'helpdesk'))
  `;
  console.log("OK constraint rol");
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("already exists") || msg.includes("usuarios_rol_check")) {
    console.log("OK constraint rol (ya existía)");
  } else {
    console.warn("Aviso constraint rol:", msg);
  }
}

await sql`CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios (rol)`;

// Los 3 usuarios ciber conocidos → seguridad
await sql`
  UPDATE usuarios SET
    rol = 'seguridad',
    updated_at = NOW()
  WHERE lower(email) IN (
    'ntorrents_sirt@kernpharma.com',
    'jcrodriguez_sirt@kernpharma.com',
    'fruiz@grupoindukern.com'
  )
`;

console.log("OK usuarios.rol");

const resumen = await sql`
  SELECT dominio, count(*)::int AS n
  FROM excepciones
  GROUP BY dominio
  ORDER BY dominio
`;
console.log("Excepciones por dominio:", resumen);

const roles = await sql`
  SELECT rol, count(*)::int AS n
  FROM usuarios
  GROUP BY rol
  ORDER BY rol
`;
console.log("Usuarios por rol:", roles);

console.log("\nMigración Fase 1 completada.");
