import type { Dominio } from "@/types/dominio";
import {
  canApprove,
  canLifecycle,
  canManageUsers,
  canSetEstadoManual,
  type Rol,
} from "@/types/roles";

export type PermissionAction =
  | "read"
  | "create"
  | "edit"
  | "approve"
  | "reject"
  | "cancel"
  | "extend"
  | "reactivate"
  | "set_estado"
  | "manage_users";

export function assertCan(
  rol: Rol,
  action: PermissionAction,
  dominio?: Dominio
): void {
  const ok = checkPermission(rol, action, dominio);
  if (!ok) {
    throw new Error(
      "No tienes permisos para esta acción. Contacta con Seguridad si la necesitas."
    );
  }
}

export function checkPermission(
  rol: Rol,
  action: PermissionAction,
  dominio?: Dominio
): boolean {
  switch (action) {
    case "read":
    case "create":
    case "edit":
      return true;
    case "approve":
    case "reject":
      return dominio ? canApprove(rol, dominio) : false;
    case "cancel":
    case "extend":
    case "reactivate":
      return dominio ? canLifecycle(rol, dominio) : false;
    case "set_estado":
      return canSetEstadoManual(rol);
    case "manage_users":
      return canManageUsers(rol);
    default:
      return false;
  }
}
