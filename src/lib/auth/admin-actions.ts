"use server";

import { randomBytes } from "node:crypto";
import { hashPassword } from "@/lib/auth/password";
import { assertCan } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session-user";
import {
  createUser,
  findUserByEmail,
  findUserById,
  listUsers,
  updateUserAdmin,
  type UsuarioPublico,
} from "@/lib/auth/users";
import { isRol, type Rol } from "@/types/roles";

export async function listUsuariosAction(): Promise<UsuarioPublico[]> {
  const me = await requireCurrentUser();
  assertCan(me.rol, "manage_users");
  return listUsers();
}

export type AdminUserResult =
  | { ok: true; user: UsuarioPublico }
  | { ok: false; error: string };

export async function createUsuarioAction(input: {
  email: string;
  nombre: string;
  apellidos: string;
  rol: Rol;
  password: string;
}): Promise<AdminUserResult> {
  const me = await requireCurrentUser();
  assertCan(me.rol, "manage_users");

  const email = input.email.trim().toLowerCase();
  const nombre = input.nombre.trim();
  const apellidos = input.apellidos.trim();
  const password = input.password.trim();

  if (!email.includes("@")) {
    return { ok: false, error: "Indica un correo válido." };
  }
  if (!nombre || !apellidos) {
    return { ok: false, error: "Nombre y apellidos son obligatorios." };
  }
  if (!isRol(input.rol)) {
    return { ok: false, error: "Rol no válido." };
  }
  if (password.length < 8) {
    return {
      ok: false,
      error: "La contraseña debe tener al menos 8 caracteres.",
    };
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return { ok: false, error: "Ya existe un usuario con ese correo." };
  }

  try {
    const user = await createUser({
      id: `usr-${randomBytes(6).toString("hex")}`,
      email,
      nombre,
      apellidos,
      rol: input.rol,
      password_hash: hashPassword(password),
      activo: true,
    });
    return { ok: true, user };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "No se pudo crear el usuario",
    };
  }
}

export async function updateUsuarioAction(input: {
  id: string;
  email: string;
  nombre: string;
  apellidos: string;
  rol: Rol;
  activo: boolean;
}): Promise<AdminUserResult> {
  const me = await requireCurrentUser();
  assertCan(me.rol, "manage_users");

  const email = input.email.trim().toLowerCase();
  const nombre = input.nombre.trim();
  const apellidos = input.apellidos.trim();

  if (!email.includes("@")) {
    return { ok: false, error: "Indica un correo válido." };
  }
  if (!nombre || !apellidos) {
    return { ok: false, error: "Nombre y apellidos son obligatorios." };
  }
  if (!isRol(input.rol)) {
    return { ok: false, error: "Rol no válido." };
  }

  const target = await findUserById(input.id);
  if (!target) {
    return { ok: false, error: "Usuario no encontrado." };
  }

  // Evitar que el último/admin se quite el rol seguridad a sí mismo sin otro.
  if (me.id === input.id && input.rol !== "seguridad") {
    return {
      ok: false,
      error: "No puedes quitarte el rol Seguridad a ti mismo.",
    };
  }
  if (me.id === input.id && !input.activo) {
    return { ok: false, error: "No puedes desactivar tu propio usuario." };
  }

  const existing = await findUserByEmail(email);
  if (existing && existing.id !== input.id) {
    return { ok: false, error: "Ese correo ya está en uso." };
  }

  try {
    const user = await updateUserAdmin(input.id, {
      email,
      nombre,
      apellidos,
      rol: input.rol,
      activo: input.activo,
    });
    return { ok: true, user };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el usuario",
    };
  }
}

export async function resetPasswordUsuarioAction(input: {
  id: string;
  newPassword: string;
}): Promise<AdminUserResult> {
  const me = await requireCurrentUser();
  assertCan(me.rol, "manage_users");

  const newPassword = input.newPassword.trim();
  if (newPassword.length < 8) {
    return {
      ok: false,
      error: "La contraseña debe tener al menos 8 caracteres.",
    };
  }

  const target = await findUserById(input.id);
  if (!target) {
    return { ok: false, error: "Usuario no encontrado." };
  }

  try {
    const user = await updateUserAdmin(input.id, {
      email: target.email,
      nombre: target.nombre,
      apellidos: target.apellidos,
      rol: target.rol,
      activo: target.activo,
      password_hash: hashPassword(newPassword),
    });
    return { ok: true, user };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo restablecer la contraseña",
    };
  }
}
