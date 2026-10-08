"use server";

import { requireCurrentUser } from "@/lib/auth/session-user";
import { resolveSandboxFilter } from "@/lib/sandbox/actions";
import {
  cerrarEventoOperativo,
  createEventoOperativo,
  getEventoOperativo,
  listEventosOperativos,
  listEventosOperativosBySujeto,
  marcarExcepcionRevisada,
  reasignarExcepcionEnOperacion,
  reasignarTodasEnOperacion,
} from "@/lib/operaciones/repository";
import type {
  EventoOperativo,
  EventoOperativoDetalle,
  EventoOperativoListItem,
  TipoEventoOperativo,
} from "@/types/operaciones";

export async function crearEventoOperativoAction(input: {
  tipo: TipoEventoOperativo;
  sujetoId: string;
  notas?: string;
}): Promise<EventoOperativoDetalle> {
  const user = await requireCurrentUser();
  return createEventoOperativo({
    tipo: input.tipo,
    sujetoId: input.sujetoId,
    actorEmail: user.email,
    notas: input.notas,
  });
}

export async function getEventoOperativoAction(
  id: string
): Promise<EventoOperativoDetalle | null> {
  await requireCurrentUser();
  return getEventoOperativo(id);
}

export async function listEventosOperativosAction(
  sujetoId: string
): Promise<EventoOperativo[]> {
  await requireCurrentUser();
  return listEventosOperativosBySujeto(sujetoId);
}

export async function listAllEventosOperativosAction(filters?: {
  estado?: "Abierto" | "Cerrado" | "Todos";
}): Promise<EventoOperativoListItem[]> {
  await requireCurrentUser();
  const sandboxMode = (await resolveSandboxFilter()) ?? false;
  return listEventosOperativos({
    ...filters,
    is_sandbox: sandboxMode,
  });
}

export async function marcarRevisadaAction(input: {
  eventoId: string;
  excepcionId: string;
  revisada: boolean;
}): Promise<void> {
  await requireCurrentUser();
  await marcarExcepcionRevisada(
    input.eventoId,
    input.excepcionId,
    input.revisada
  );
}

export async function reasignarExcepcionOperacionAction(input: {
  eventoId: string;
  excepcionId: string;
  nuevoUsuario?: string;
  nuevoActivo?: string;
}): Promise<EventoOperativoDetalle> {
  const user = await requireCurrentUser();
  return reasignarExcepcionEnOperacion({
    ...input,
    actorEmail: user.email,
  });
}

export async function reasignarTodasOperacionAction(input: {
  eventoId: string;
  nuevoUsuario?: string;
  nuevoActivo?: string;
}): Promise<EventoOperativoDetalle> {
  const user = await requireCurrentUser();
  return reasignarTodasEnOperacion({
    ...input,
    actorEmail: user.email,
  });
}

export async function cerrarEventoOperativoAction(
  eventoId: string
): Promise<EventoOperativoDetalle> {
  await requireCurrentUser();
  return cerrarEventoOperativo(eventoId);
}
