import type { Dominio } from "@/types/dominio";

/** Roles de la app (local hasta Entra ID). Seguridad = admin de la aplicación. */
export const ROLES = ["seguridad", "sistemas", "helpdesk"] as const;
export type Rol = (typeof ROLES)[number];

export const ROL_LABELS: Record<Rol, string> = {
  seguridad: "Seguridad (admin)",
  sistemas: "Sistemas",
  helpdesk: "Helpdesk",
};

export function isRol(value: string): value is Rol {
  return (ROLES as readonly string[]).includes(value);
}

export function isSeguridad(rol: Rol): boolean {
  return rol === "seguridad";
}

/** Puede aprobar/rechazar según dominio. */
export function canApprove(rol: Rol, dominio: Dominio): boolean {
  if (rol === "seguridad") return true;
  if (rol === "sistemas" && dominio === "sistemas") return true;
  return false;
}

/** Cancelar / ampliar / reactivar. */
export function canLifecycle(rol: Rol, dominio: Dominio): boolean {
  if (rol === "seguridad") return true;
  if (rol === "sistemas" && dominio === "sistemas") return true;
  if (rol === "helpdesk" && dominio === "helpdesk") return true;
  return false;
}

/** Crear y editar datos: todos los roles IT. */
export function canCreateOrEdit(_rol: Rol): boolean {
  return true;
}

/** Cambiar estado manualmente en alta/edición (p. ej. crear ya Aprobada). */
export function canSetEstadoManual(rol: Rol): boolean {
  return rol === "seguridad";
}

/** Gestión de usuarios, roles y reset de contraseña. */
export function canManageUsers(rol: Rol): boolean {
  return rol === "seguridad";
}
