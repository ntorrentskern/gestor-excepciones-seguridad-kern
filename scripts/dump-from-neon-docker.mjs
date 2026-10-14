/**
 * Alternativa a dump-from-neon.mjs cuando no hay pg_dump en el host:
 * usa la imagen postgres:16 para volcar Neon.
 *
 * Uso:
 *   node --env-file=.env.local scripts/dump-from-neon-docker.mjs
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

const outFile = process.env.DUMP_PATH ?? "backup_excepciones.dump";
const absOut = resolve(outFile);
const cwd = process.cwd();

console.log(`Creando dump con Docker en ${absOut} …`);

const result = spawnSync(
  "docker",
  [
    "run",
    "--rm",
    "-v",
    `${cwd}:/backup`,
    "postgres:16",
    "pg_dump",
    connectionString,
    "-F",
    "c",
    "-b",
    "-v",
    "-f",
    `/backup/${outFile.replace(/\\/g, "/")}`,
  ],
  { stdio: "inherit", shell: process.platform === "win32" }
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
