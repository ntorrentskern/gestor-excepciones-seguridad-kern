/**
 * Restaura un .dump en el Postgres del docker-compose.
 *
 * Uso (con el servicio postgres arriba):
 *   node --env-file=.env scripts/restore-to-local.mjs
 *   # o
 *   node scripts/restore-to-local.mjs
 *
 * Variables:
 *   DUMP_PATH          (default: backup_excepciones.dump)
 *   LOCAL_DATABASE_URL (default: postgresql://gestor:gestor@localhost:5432/gestor_excepciones)
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const dumpFile = resolve(process.env.DUMP_PATH ?? "backup_excepciones.dump");
const localUrl =
  process.env.LOCAL_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://gestor:gestor@localhost:5432/gestor_excepciones";

if (!existsSync(dumpFile)) {
  console.error(`No existe el dump: ${dumpFile}`);
  console.error("Genera uno antes con: npm run db:dump:neon");
  process.exit(1);
}

console.log(`Restaurando ${dumpFile} → Postgres local …`);

const result = spawnSync(
  "pg_restore",
  [
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-acl",
    "-d",
    localUrl,
    dumpFile,
  ],
  { stdio: "inherit", shell: process.platform === "win32" }
);

if (result.error) {
  console.error(
    "No se pudo ejecutar pg_restore. Alternativa con Docker:\n" +
      "  docker compose exec -T postgres pg_restore --clean --if-exists --no-owner --no-acl -U gestor -d gestor_excepciones < backup_excepciones.dump"
  );
  console.error(result.error.message);
  process.exit(1);
}

// pg_restore puede devolver 1 con warnings no fatales
if ((result.status ?? 1) > 1) {
  process.exit(result.status ?? 1);
}

console.log("Restore completado.");
