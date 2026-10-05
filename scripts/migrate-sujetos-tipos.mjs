/**
 * Migración: simplifica tipos de sujetos a usuario | activo | otro.
 * Idempotente: se puede ejecutar varias veces (local y producción).
 *
 * Uso: npm run db:migrate:sujetos-tipos
 */
import { neon } from "@neondatabase/serverless";

const databaseUrl =
  process.env.DATABASE_URL ?? process.env.STORAGE_DATABASE_URL;

if (!databaseUrl) {
  console.error("Falta DATABASE_URL o STORAGE_DATABASE_URL");
  process.exit(1);
}

const sql = neon(databaseUrl);

console.log("→ Migración tipos de sujetos (Usuario / Activo / Otro)…");

const tables = await sql`
  SELECT 1 AS ok
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'sujetos'
  LIMIT 1
`;

if (!tables[0]) {
  console.log(
    "Tabla sujetos no existe todavía. Ejecuta antes: npm run db:migrate:fase2"
  );
  process.exit(0);
}

// Remapear tipos legacy → activo (fusionando si ya existe activo con la misma clave)
const legacy = await sql`
  SELECT id, tipo, lower(clave) AS clave_norm
  FROM sujetos
  WHERE tipo IN ('pc', 'dispositivo', 'servidor', 'cuenta')
`;

let remapped = 0;
let merged = 0;

for (const row of legacy) {
  const existing = await sql`
    SELECT id FROM sujetos
    WHERE tipo = 'activo' AND lower(clave) = ${row.clave_norm}
    LIMIT 1
  `;

  if (existing[0]) {
    await sql`
      UPDATE excepcion_sujeto SET sujeto_id = ${existing[0].id}
      WHERE sujeto_id = ${row.id}
        AND NOT EXISTS (
          SELECT 1 FROM excepcion_sujeto es2
          WHERE es2.excepcion_id = excepcion_sujeto.excepcion_id
            AND es2.sujeto_id = ${existing[0].id}
        )
    `;
    await sql`DELETE FROM excepcion_sujeto WHERE sujeto_id = ${row.id}`;

    // eventos_operativos puede no existir en installs antiguos
    try {
      await sql`
        UPDATE eventos_operativos SET sujeto_id = ${existing[0].id}
        WHERE sujeto_id = ${row.id}
      `;
    } catch {
      /* ignore */
    }

    await sql`DELETE FROM sujetos WHERE id = ${row.id}`;
    merged += 1;
  } else {
    await sql`
      UPDATE sujetos SET tipo = 'activo', updated_at = NOW()
      WHERE id = ${row.id}
    `;
    remapped += 1;
  }
}

// Quitar cualquier CHECK antiguo sobre tipo (nombre variable según Postgres)
const checks = await sql`
  SELECT c.conname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'sujetos'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%tipo%'
`;

for (const c of checks) {
  // Identifiers from pg_constraint; quote to be safe
  const name = String(c.conname).replace(/"/g, '""');
  await sql.query(`ALTER TABLE sujetos DROP CONSTRAINT IF EXISTS "${name}"`);
  console.log(`  drop constraint ${c.conname}`);
}

// Idempotente: solo añadir si no existe ya
const hasCheck = await sql`
  SELECT 1 AS ok
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'sujetos'
    AND c.conname = 'sujetos_tipo_check'
  LIMIT 1
`;

if (!hasCheck[0]) {
  await sql`
    ALTER TABLE sujetos
    ADD CONSTRAINT sujetos_tipo_check
    CHECK (tipo IN ('usuario', 'activo', 'otro'))
  `;
  console.log("  add constraint sujetos_tipo_check");
} else {
  console.log("  constraint sujetos_tipo_check ya existe");
}

const tipos = await sql`
  SELECT tipo, count(*)::int AS n
  FROM sujetos
  GROUP BY tipo
  ORDER BY tipo
`;

const invalid = tipos.filter(
  (t) => !["usuario", "activo", "otro"].includes(t.tipo)
);

console.log(
  `OK: ${remapped} remapeados a activo, ${merged} fusionados.`
);
console.log(
  "Tipos actuales:",
  tipos.map((t) => `${t.tipo}=${t.n}`).join(", ") || "(vacío)"
);

if (invalid.length) {
  console.error(
    "ERROR: quedan tipos no permitidos:",
    invalid.map((t) => t.tipo).join(", ")
  );
  process.exit(1);
}

console.log("Constraint sujetos_tipo_check = usuario | activo | otro");
