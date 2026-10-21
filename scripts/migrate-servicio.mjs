/**
 * Migración: añade tipo «servicio» a sujetos (CMDB).
 * Idempotente.
 *
 * Uso: npm run db:migrate:servicio
 */
import { neon } from "@neondatabase/serverless";

const databaseUrl =
  process.env.DATABASE_URL ?? process.env.STORAGE_DATABASE_URL;

if (!databaseUrl) {
  console.error("Falta DATABASE_URL o STORAGE_DATABASE_URL");
  process.exit(1);
}

const sql = neon(databaseUrl);

console.log("→ Migración tipo servicio en sujetos…");

const tables = await sql`
  SELECT 1 AS ok
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'sujetos'
  LIMIT 1
`;

if (!tables[0]) {
  console.log("Tabla sujetos no existe. Ejecuta antes las migraciones base.");
  process.exit(0);
}

const checks = await sql`
  SELECT c.conname, pg_get_constraintdef(c.oid) AS def
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'sujetos'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%tipo%'
`;

const alreadyOk = checks.some((c) =>
  String(c.def).toLowerCase().includes("'servicio'")
);

if (alreadyOk) {
  console.log("  constraint ya incluye servicio");
} else {
  for (const c of checks) {
    const name = String(c.conname).replace(/"/g, '""');
    await sql.query(`ALTER TABLE sujetos DROP CONSTRAINT IF EXISTS "${name}"`);
    console.log(`  drop constraint ${c.conname}`);
  }

  await sql`
    ALTER TABLE sujetos
    ADD CONSTRAINT sujetos_tipo_check
    CHECK (tipo IN ('usuario', 'activo', 'servicio', 'otro'))
  `;
  console.log("  add constraint sujetos_tipo_check (+ servicio)");
}

const tipos = await sql`
  SELECT tipo, count(*)::int AS n
  FROM sujetos
  GROUP BY tipo
  ORDER BY tipo
`;

console.log(
  "Tipos actuales:",
  tipos.map((t) => `${t.tipo}=${t.n}`).join(", ") || "(vacío)"
);
console.log("OK");
