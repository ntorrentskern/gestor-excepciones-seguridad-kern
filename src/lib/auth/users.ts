import { sql } from "@/lib/db";
import { isRol, type Rol } from "@/types/roles";

export type Usuario = {
  id: string;
  email: string;
  nombre: string;
  apellidos: string;
  password_hash: string;
  rol: Rol;
  activo: boolean;
};

export type UsuarioPublico = Omit<Usuario, "password_hash">;

type UsuarioRow = {
  id: string;
  email: string;
  nombre: string;
  apellidos: string;
  password_hash: string;
  rol: string;
  activo: boolean;
};

function mapUser(row: UsuarioRow): Usuario {
  return {
    id: row.id,
    email: row.email,
    nombre: row.nombre,
    apellidos: row.apellidos,
    password_hash: row.password_hash,
    rol: isRol(row.rol) ? row.rol : "helpdesk",
    activo: Boolean(row.activo),
  };
}

export async function findUserByEmail(email: string): Promise<Usuario | null> {
  const rows = (await sql`
    SELECT id, email, nombre, apellidos, password_hash, rol, activo
    FROM usuarios
    WHERE lower(email) = ${email.trim().toLowerCase()}
    LIMIT 1
  `) as UsuarioRow[];
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findUserById(id: string): Promise<Usuario | null> {
  const rows = (await sql`
    SELECT id, email, nombre, apellidos, password_hash, rol, activo
    FROM usuarios
    WHERE id = ${id}
    LIMIT 1
  `) as UsuarioRow[];
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function listUsers(): Promise<UsuarioPublico[]> {
  const rows = (await sql`
    SELECT id, email, nombre, apellidos, password_hash, rol, activo
    FROM usuarios
    ORDER BY apellidos ASC, nombre ASC, email ASC
  `) as UsuarioRow[];
  return rows.map((row) => toPublicUser(mapUser(row)));
}

export async function listUsersByRoles(
  roles: Rol[],
  onlyActive = true
): Promise<UsuarioPublico[]> {
  if (roles.length === 0) return [];
  const rows = (await sql`
    SELECT id, email, nombre, apellidos, password_hash, rol, activo
    FROM usuarios
    WHERE rol = ANY(${roles})
      AND (${!onlyActive} OR activo = TRUE)
    ORDER BY apellidos ASC, nombre ASC, email ASC
  `) as UsuarioRow[];
  return rows.map((row) => toPublicUser(mapUser(row)));
}

export async function createUser(data: {
  id: string;
  email: string;
  nombre: string;
  apellidos: string;
  password_hash: string;
  rol: Rol;
  activo?: boolean;
}): Promise<UsuarioPublico> {
  await sql`
    INSERT INTO usuarios (id, email, nombre, apellidos, password_hash, rol, activo)
    VALUES (
      ${data.id},
      ${data.email.toLowerCase()},
      ${data.nombre},
      ${data.apellidos},
      ${data.password_hash},
      ${data.rol},
      ${data.activo ?? true}
    )
  `;
  const created = await findUserById(data.id);
  if (!created) throw new Error("Usuario no encontrado tras crear");
  return toPublicUser(created);
}

export async function updateUserAdmin(
  id: string,
  data: {
    nombre: string;
    apellidos: string;
    email: string;
    rol: Rol;
    activo: boolean;
    password_hash?: string;
  }
): Promise<UsuarioPublico> {
  if (data.password_hash) {
    await sql`
      UPDATE usuarios SET
        nombre = ${data.nombre},
        apellidos = ${data.apellidos},
        email = ${data.email.toLowerCase()},
        rol = ${data.rol},
        activo = ${data.activo},
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
        rol = ${data.rol},
        activo = ${data.activo},
        updated_at = NOW()
      WHERE id = ${id}
    `;
  }
  const updated = await findUserById(id);
  if (!updated) throw new Error("Usuario no encontrado tras actualizar");
  return toPublicUser(updated);
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
