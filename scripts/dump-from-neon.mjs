/**
 * Vuelca Neon a un archivo .dump (formato custom de pg_dump).
 *
 * Uso (PowerShell):
 *   node --env-file=.env.local scripts/dump-from-neon.mjs
 *
 * Variables:
 *   NEON_DATABASE_URL  (preferida) o DATABASE_URL / STORAGE_DATABASE_URL
 *   DUMP_PATH          (opcional, default: backup_excepciones.dump)
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const connectionString =
  process.env.NEON_DATABASE_URL ??
  process.env.DATABASE_URL ??
  process.env.STORAGE_DATABASE_URL;

if (!connectionString) {
  console.error(
    "Falta NEON_DATABASE_URL (o DATABASE_URL / STORAGE_DATABASE_URL)."
  );
  process.exit(1);
}

const outFile = resolve(
  process.env.DUMP_PATH ?? "backup_excepciones.dump"
);

console.log(`Creando dump en ${outFile} …`);

const result = spawnSync(
  "pg_dump",
  [connectionString, "-F", "c", "-b", "-v", "-f", outFile],
  { stdio: "inherit", shell: process.platform === "win32" }
);

if (result.error) {
  console.error(
    "No se pudo ejecutar pg_dump. Instala PostgreSQL client tools o usa Docker:\n" +
      '  docker run --rm -v "%CD%:/backup" postgres:16 pg_dump "$NEON_DATABASE_URL" -F c -b -v -f /backup/backup_excepciones.dump'
  );
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
