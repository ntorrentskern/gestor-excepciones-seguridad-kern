"use server";

import { requireCurrentUser } from "@/lib/auth/session-user";
import { listUsersByRoles } from "@/lib/auth/users";
import { APROBADORES_PREDEFINIDOS } from "@/types/excepcion";
import type { Dominio } from "@/types/dominio";
import type { Rol } from "@/types/roles";

export type AprobadorOption = {
  email: string;
  label: string;
  rol: Rol | "legacy";
};

/** Aprobadores según dominio: Seguridad siempre; Sistemas también en dominio sistemas. */
export async function listAprobadoresAction(
  dominio?: Dominio
): Promise<AprobadorOption[]> {
  await requireCurrentUser();

  const roles: Rol[] =
    dominio === "sistemas" ? ["seguridad", "sistemas"] : ["seguridad"];

  const users = await listUsersByRoles(roles, true);
  if (users.length > 0) {
    return users.map((u) => ({
      email: u.email,
      label: `${u.nombre} ${u.apellidos}`.trim() || u.email,
      rol: u.rol,
    }));
  }

  // Fallback si aún no hay usuarios con rol en BBDD
  return APROBADORES_PREDEFINIDOS.map((email) => ({
    email,
    label: email,
    rol: "legacy" as const,
  }));
}
