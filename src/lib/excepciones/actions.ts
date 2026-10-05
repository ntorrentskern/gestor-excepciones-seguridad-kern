"use server";

import { requireCurrentUser } from "@/lib/auth/session-user";
import { assertCan } from "@/lib/auth/permissions";
import { neonExcepcionesRepository } from "@/lib/excepciones/db-repository";
import type {
  AmpliarInput,
  DecisionInput,
  ComentarInput,
  ReactivarInput,
} from "@/lib/excepciones/types";
import type {
  EditarExcepcionInput,
  Excepcion,
  ExcepcionFilters,
  NuevaExcepcionInput,
} from "@/types/excepcion";
import { canSetEstadoManual } from "@/types/roles";

export async function listExcepciones(
  filters?: ExcepcionFilters
): Promise<Excepcion[]> {
  await requireCurrentUser();
  return neonExcepcionesRepository.list(filters);
}

export async function getExcepcionById(
  id: string
): Promise<Excepcion | null> {
  await requireCurrentUser();
  return neonExcepcionesRepository.getById(id);
}

export async function createExcepcion(
  input: NuevaExcepcionInput
): Promise<Excepcion> {
  const user = await requireCurrentUser();
  assertCan(user.rol, "create");

  const payload: NuevaExcepcionInput = {
    ...input,
    // Helpdesk/Sistemas siempre crean como Pendiente; solo Seguridad puede forzar otro estado.
    estado: canSetEstadoManual(user.rol)
      ? (input.estado ?? "Pendiente")
      : "Pendiente",
  };

  return neonExcepcionesRepository.create(payload);
}

export async function editarExcepcion(
  id: string,
  input: EditarExcepcionInput
): Promise<Excepcion> {
  const user = await requireCurrentUser();
  assertCan(user.rol, "edit");

  const current = await neonExcepcionesRepository.getById(id);
  if (!current) throw new Error(`Excepción no encontrada: ${id}`);

  const nextEstado = canSetEstadoManual(user.rol)
    ? input.estado
    : current.estado;

  return neonExcepcionesRepository.editar(id, {
    ...input,
    estado: nextEstado,
  });
}

export async function aprobarExcepcion(
  id: string,
  input?: DecisionInput
): Promise<Excepcion> {
  const user = await requireCurrentUser();
  const current = await neonExcepcionesRepository.getById(id);
  if (!current) throw new Error(`Excepción no encontrada: ${id}`);
  assertCan(user.rol, "approve", current.dominio);
  return neonExcepcionesRepository.aprobar(id, {
    ...input,
    actorEmail: input?.actorEmail ?? user.email,
  });
}

export async function rechazarExcepcion(
  id: string,
  input?: DecisionInput
): Promise<Excepcion> {
  const user = await requireCurrentUser();
  const current = await neonExcepcionesRepository.getById(id);
  if (!current) throw new Error(`Excepción no encontrada: ${id}`);
  assertCan(user.rol, "reject", current.dominio);
  return neonExcepcionesRepository.rechazar(id, {
    ...input,
    actorEmail: input?.actorEmail ?? user.email,
  });
}

export async function cancelarExcepcion(
  id: string,
  input?: DecisionInput
): Promise<Excepcion> {
  const user = await requireCurrentUser();
  const current = await neonExcepcionesRepository.getById(id);
  if (!current) throw new Error(`Excepción no encontrada: ${id}`);
  assertCan(user.rol, "cancel", current.dominio);
  return neonExcepcionesRepository.cancelar(id, {
    ...input,
    actorEmail: input?.actorEmail ?? user.email,
  });
}

export async function ampliarExcepcion(
  id: string,
  input: AmpliarInput
): Promise<Excepcion> {
  const user = await requireCurrentUser();
  const current = await neonExcepcionesRepository.getById(id);
  if (!current) throw new Error(`Excepción no encontrada: ${id}`);
  assertCan(user.rol, "extend", current.dominio);
  return neonExcepcionesRepository.ampliar(id, {
    ...input,
    actorEmail: input.actorEmail ?? user.email,
  });
}

export async function reactivarExcepcion(
  id: string,
  input: ReactivarInput
): Promise<Excepcion> {
  const user = await requireCurrentUser();
  const current = await neonExcepcionesRepository.getById(id);
  if (!current) throw new Error(`Excepción no encontrada: ${id}`);
  assertCan(user.rol, "reactivate", current.dominio);
  return neonExcepcionesRepository.reactivar(id, {
    ...input,
    actorEmail: input.actorEmail ?? user.email,
  });
}

export async function comentarExcepcion(
  id: string,
  input: ComentarInput
): Promise<Excepcion> {
  const user = await requireCurrentUser();
  assertCan(user.rol, "edit");
  return neonExcepcionesRepository.comentar(id, {
    ...input,
    actorEmail: input.actorEmail ?? user.email,
  });
}
