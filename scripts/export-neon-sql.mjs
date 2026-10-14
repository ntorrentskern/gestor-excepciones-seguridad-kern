/**
 * Exporta schema public de Neon a SQL plano (sin pg_dump).
 * Uso: node --env-file=.env.local scripts/export-neon-sql.mjs
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

const url =
  process.env.NEON_DATABASE_URL ??
  process.env.DATABASE_URL ??
  process.env.STORAGE_DATABASE_URL;

if (!url) {
  console.error("Falta DATABASE_URL / NEON_DATABASE_URL");
  process.exit(1);
}

const outPath = resolve(process.env.DUMP_PATH ?? "backup_excepciones.dump");

const sql = postgres(url, {
  ssl: "require",
  max: 1,
  prepare: false,
});

function qIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function literal(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (Buffer.isBuffer(value)) {
    return `'\\x${value.toString("hex")}'`;
  }
  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

const tables = (
  await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `
).map((r) => r.table_name);

/** Orden que respeta FKs típicas del gestor. */
const preferred = [
  "usuarios",
  "sujetos",
  "excepciones",
  "eventos_auditoria",
  "excepcion_sujeto",
  "eventos_operativos",
  "evento_operativo_excepcion",
];
const ordered = [
  ...preferred.filter((t) => tables.includes(t)),
  ...tables.filter((t) => !preferred.includes(t)),
];

const lines = [];
lines.push("-- Backup gestor-excepciones (SQL plano desde Neon)");
lines.push(`-- Generado: ${new Date().toISOString()}`);
lines.push("BEGIN;");
lines.push("SET session_replication_role = replica;");
lines.push("");

for (const table of [...ordered].reverse()) {
  lines.push(`TRUNCATE TABLE ${qIdent(table)} CASCADE;`);
}
lines.push("");

for (const table of ordered) {
  const rows = await sql.unsafe(`SELECT * FROM ${qIdent(table)}`);
  lines.push(`-- ${table}: ${rows.length} filas`);
  if (rows.length === 0) {
    lines.push("");
    continue;
  }
  const cols = Object.keys(rows[0]);
  const colList = cols.map(qIdent).join(", ");
  for (const row of rows) {
    const values = cols.map((c) => literal(row[c])).join(", ");
    lines.push(
      `INSERT INTO ${qIdent(table)} (${colList}) VALUES (${values});`
    );
  }
  lines.push("");
}

lines.push("SET session_replication_role = DEFAULT;");
lines.push("COMMIT;");

writeFileSync(outPath, lines.join("\n"), "utf8");
await sql.end({ timeout: 5 });
console.log(`OK: ${outPath} (${ordered.length} tablas)`);
