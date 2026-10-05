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
    rol TEXT NOT NULL DEFAULT 'helpdesk'
      CHECK (rol IN ('seguridad', 'sistemas', 'helpdesk')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol TEXT`;
await sql`
  UPDATE usuarios SET rol = 'seguridad'
  WHERE rol IS NULL OR trim(rol) = ''
`;
try {
  await sql`ALTER TABLE usuarios ALTER COLUMN rol SET DEFAULT 'helpdesk'`;
  await sql`ALTER TABLE usuarios ALTER COLUMN rol SET NOT NULL`;
} catch {
  /* ignore */
}
await sql`CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email)`;
await sql`CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios (rol)`;
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
    rol: "seguridad",
  },
  {
    id: "usr-jcrodriguez",
    email: "jcrodriguez_sirt@kernpharma.com",
    nombre: "Juan Carlos",
    apellidos: "Rodriguez",
    password: "Indukern2026!",
    rol: "seguridad",
  },
  {
    id: "usr-fruiz",
    email: "fruiz@grupoindukern.com",
    nombre: "Ferran",
    apellidos: "Ruiz",
    password: "Indukern2026!",
    rol: "seguridad",
  },
];

for (const u of users) {
  const passwordHash = hashPassword(u.password);
  await sql`
    INSERT INTO usuarios (id, email, nombre, apellidos, password_hash, rol, activo)
    VALUES (
      ${u.id},
      ${u.email.toLowerCase()},
      ${u.nombre},
      ${u.apellidos},
      ${passwordHash},
      ${u.rol},
      ${true}
    )
    ON CONFLICT (email) DO UPDATE SET
      nombre = EXCLUDED.nombre,
      apellidos = EXCLUDED.apellidos,
      password_hash = EXCLUDED.password_hash,
      rol = EXCLUDED.rol,
      activo = TRUE,
      updated_at = NOW()
  `;
  console.log("OK usuario", u.email, "→", u.rol);
}

console.log("\nContraseña temporal inicial para los 3: Indukern2026!");
console.log("Cámbiala desde Ajustes tras el primer acceso.");
