import { sql } from "@/lib/db";

export type Usuario = {
  id: string;
  email: string;
  nombre: string;
  apellidos: string;
  password_hash: string;
  activo: boolean;
};

export type UsuarioPublico = Omit<Usuario, "password_hash">;

function mapUser(row: {
  id: string;
  email: string;
  nombre: string;
  apellidos: string;
  password_hash: string;
  activo: boolean;
}): Usuario {
  return {
    id: row.id,
    email: row.email,
    nombre: row.nombre,
    apellidos: row.apellidos,
    password_hash: row.password_hash,
    activo: Boolean(row.activo),
  };
}

export async function findUserByEmail(email: string): Promise<Usuario | null> {
  const rows = (await sql`
    SELECT id, email, nombre, apellidos, password_hash, activo
    FROM usuarios
    WHERE lower(email) = ${email.trim().toLowerCase()}
    LIMIT 1
  `) as Array<{
    id: string;
    email: string;
    nombre: string;
    apellidos: string;
    password_hash: string;
    activo: boolean;
  }>;
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findUserById(id: string): Promise<Usuario | null> {
  const rows = (await sql`
    SELECT id, email, nombre, apellidos, password_hash, activo
    FROM usuarios
    WHERE id = ${id}
    LIMIT 1
  `) as Array<{
    id: string;
    email: string;
    nombre: string;
    apellidos: string;
    password_hash: string;
    activo: boolean;
  }>;
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function updateUserProfile(
  id: string,
  data: {
    nombre: string;
    apellidos: string;
    email: string;
    password_hash?: string;
  }
): Promise<UsuarioPublico> {
  if (data.password_hash) {
    await sql`
      UPDATE usuarios SET
        nombre = ${data.nombre},
        apellidos = ${data.apellidos},
        email = ${data.email.toLowerCase()},
        password_hash = ${data.password_hash},
        updated_at = NOW()
      WHERE id = ${id}
    `;
  } else {
    await sql`
      UPDATE usuarios SET
        nombre = ${data.nombre},
        apellidos = ${data.apellidos},
        email = ${data.email.toLowerCase()},
        updated_at = NOW()
      WHERE id = ${id}
    `;
  }

  const updated = await findUserById(id);
  if (!updated) throw new Error("Usuario no encontrado tras actualizar");
  const { password_hash: _, ...pub } = updated;
  return pub;
}

export function toPublicUser(user: Usuario): UsuarioPublico {
  const { password_hash: _, ...pub } = user;
  return pub;
}
