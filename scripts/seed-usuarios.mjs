import { neon } from "@neondatabase/serverless";
import { randomBytes, scryptSync } from "node:crypto";

const databaseUrl =
  process.env.DATABASE_URL ?? process.env.STORAGE_DATABASE_URL;

if (!databaseUrl) {
  console.error("Falta DATABASE_URL o STORAGE_DATABASE_URL");
  process.exit(1);
}

const sql = neon(databaseUrl);

await sql`
  CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL DEFAULT '',
    apellidos TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email)`;
console.log("OK tabla usuarios");

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

const users = [
  {
    id: "usr-ntorrents",
    email: "ntorrents_sirt@kernpharma.com",
    nombre: "Nil",
    apellidos: "Torrents",
    password: "Indukern2026!",
  },
  {
    id: "usr-jcrodriguez",
    email: "jcrodriguez_sirt@kernpharma.com",
    nombre: "Juan Carlos",
    apellidos: "Rodriguez",
    password: "Indukern2026!",
  },
  {
    id: "usr-fruiz",
    email: "fruiz@grupoindukern.com",
    nombre: "Ferran",
    apellidos: "Ruiz",
    password: "Indukern2026!",
  },
];

for (const u of users) {
  const passwordHash = hashPassword(u.password);
  await sql`
    INSERT INTO usuarios (id, email, nombre, apellidos, password_hash, activo)
    VALUES (
      ${u.id},
      ${u.email.toLowerCase()},
      ${u.nombre},
      ${u.apellidos},
      ${passwordHash},
      ${true}
    )
    ON CONFLICT (email) DO UPDATE SET
      nombre = EXCLUDED.nombre,
      apellidos = EXCLUDED.apellidos,
      password_hash = EXCLUDED.password_hash,
      activo = TRUE,
      updated_at = NOW()
  `;
  console.log("OK usuario", u.email);
}

console.log("\nContraseña temporal inicial para los 3: Indukern2026!");
console.log("Cámbiala desde Ajustes tras el primer acceso.");
