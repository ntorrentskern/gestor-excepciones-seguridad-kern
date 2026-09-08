"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE,
  decodeSession,
  encodeSession,
  sessionMaxAgeSeconds,
  type SessionPayload,
} from "@/lib/auth/session";
import {
  findUserByEmail,
  findUserById,
  toPublicUser,
  updateUserProfile,
  type UsuarioPublico,
} from "@/lib/auth/users";

async function setSessionCookie(payload: SessionPayload, remember: boolean) {
  const token = encodeSession(payload);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionMaxAgeSeconds(remember),
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  return decodeSession(jar.get(SESSION_COOKIE)?.value);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function getCurrentUser(): Promise<UsuarioPublico | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await findUserById(session.userId);
  if (!user || !user.activo) return null;
  return toPublicUser(user);
}

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string };

export async function loginAction(input: {
  email: string;
  password: string;
  remember: boolean;
}): Promise<LoginResult> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!email || !password) {
    return { ok: false, error: "Indica usuario y contraseña." };
  }

  const user = await findUserByEmail(email);
  if (!user || !user.activo) {
    return { ok: false, error: "Credenciales incorrectas." };
  }
  if (!verifyPassword(password, user.password_hash)) {
    return { ok: false, error: "Credenciales incorrectas." };
  }

  const maxAge = sessionMaxAgeSeconds(input.remember);
  await setSessionCookie(
    {
      userId: user.id,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + maxAge,
    },
    input.remember
  );

  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

export type UpdateProfileResult =
  | { ok: true; user: UsuarioPublico }
  | { ok: false; error: string };

export async function updateProfileAction(input: {
  nombre: string;
  apellidos: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<UpdateProfileResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Sesión no válida. Vuelve a iniciar sesión." };
  }

  const user = await findUserById(session.userId);
  if (!user || !user.activo) {
    return { ok: false, error: "Usuario no encontrado." };
  }

  const nombre = input.nombre.trim();
  const apellidos = input.apellidos.trim();
  const email = input.email.trim().toLowerCase();

  if (!nombre || !apellidos) {
    return { ok: false, error: "Nombre y apellidos son obligatorios." };
  }
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Indica un correo válido." };
  }

  if (email !== user.email.toLowerCase()) {
    const existing = await findUserByEmail(email);
    if (existing && existing.id !== user.id) {
      return { ok: false, error: "Ese correo ya está en uso." };
    }
  }

  const wantsPasswordChange = Boolean(input.newPassword?.trim());
  let passwordHash: string | undefined;

  if (wantsPasswordChange) {
    if (!input.currentPassword) {
      return {
        ok: false,
        error: "Para cambiar la contraseña indica la actual.",
      };
    }
    if (!verifyPassword(input.currentPassword, user.password_hash)) {
      return { ok: false, error: "La contraseña actual no es correcta." };
    }
    if ((input.newPassword?.trim().length ?? 0) < 8) {
      return {
        ok: false,
        error: "La nueva contraseña debe tener al menos 8 caracteres.",
      };
    }
    passwordHash = hashPassword(input.newPassword!.trim());
  }

  try {
    const updated = await updateUserProfile(user.id, {
      nombre,
      apellidos,
      email,
      password_hash: passwordHash,
    });

    if (email !== session.email) {
      const jar = await cookies();
      const current = jar.get(SESSION_COOKIE)?.value;
      const decoded = decodeSession(current);
      if (decoded) {
        const remaining = Math.max(decoded.exp - Math.floor(Date.now() / 1000), 60);
        await setSessionCookie(
          { ...decoded, email, exp: Math.floor(Date.now() / 1000) + remaining },
          remaining > 60 * 60 * 24
        );
      }
    }

    return { ok: true, user: updated };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "No se pudo guardar el perfil",
    };
  }
}
