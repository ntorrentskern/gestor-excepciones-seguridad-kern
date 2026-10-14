/**
 * Restaura backup_excepciones.dump (SQL plano) en el Postgres del compose.
 *
 * Uso (postgres del compose en marcha, puerto 5432):
 *   node scripts/restore-to-local.mjs
 *
 * Variables:
 *   DUMP_PATH          (default: backup_excepciones.dump)
 *   LOCAL_DATABASE_URL (default: postgresql://gestor:gestor@localhost:5432/gestor_excepciones)
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

const dumpFile = resolve(process.env.DUMP_PATH ?? "backup_excepciones.dump");
const localUrl =
  process.env.LOCAL_DATABASE_URL ??
  "postgresql://gestor:gestor@localhost:5432/gestor_excepciones";

if (!existsSync(dumpFile)) {
  console.error(`No existe el dump: ${dumpFile}`);
  process.exit(1);
}

const sqlText = readFileSync(dumpFile, "utf8");

// Preferir psql si existe; si no, aplicar con postgres.js
const psql = spawnSync(
  "psql",
  [localUrl, "-v", "ON_ERROR_STOP=1", "-f", dumpFile],
  { stdio: "inherit", shell: process.platform === "win32" }
);

if (!psql.error && (psql.status ?? 1) === 0) {
  console.log("Restore completado (psql).");
  process.exit(0);
}

console.log("psql no disponible; restaurando con postgres.js …");
const sql = postgres(localUrl, { max: 1, prepare: false });
try {
  await sql.unsafe(sqlText);
  console.log("Restore completado (postgres.js).");
} finally {
  await sql.end({ timeout: 5 });
}
