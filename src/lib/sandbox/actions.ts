"use server";

import { cookies } from "next/headers";
import { requireCurrentUser } from "@/lib/auth/session-user";
import {
  canAccessSandbox,
  SANDBOX_COOKIE,
} from "@/lib/sandbox/config";
import { reseedSandboxData } from "@/lib/sandbox/seed-data";

export async function getSandboxModeAction(): Promise<boolean> {
  const user = await requireCurrentUser();
  if (!canAccessSandbox(user.email)) return false;
  const jar = await cookies();
  return jar.get(SANDBOX_COOKIE)?.value === "1";
}

export async function setSandboxModeAction(enabled: boolean): Promise<boolean> {
  const user = await requireCurrentUser();
  if (!canAccessSandbox(user.email)) {
    throw new Error("No tienes acceso al entorno de demostración.");
  }
  const jar = await cookies();
  if (enabled) {
    jar.set(SANDBOX_COOKIE, "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
      httpOnly: false,
    });
  } else {
    jar.delete(SANDBOX_COOKIE);
  }
  return enabled;
}

/** Lee el modo sandbox para filtrar en Server Actions. */
export async function resolveSandboxFilter(): Promise<boolean | null> {
  try {
    const user = await requireCurrentUser();
    if (!canAccessSandbox(user.email)) return false;
    const jar = await cookies();
    const on = jar.get(SANDBOX_COOKIE)?.value === "1";
    return on;
  } catch {
    return false;
  }
}

/** Regenera los datos de demostración (idempotente, in-process). */
export async function reseedSandboxAction(): Promise<{ message: string }> {
  const user = await requireCurrentUser();
  if (!canAccessSandbox(user.email)) {
    throw new Error("No tienes acceso al entorno de demostración.");
  }
  const message = await reseedSandboxData();
  return { message };
}
