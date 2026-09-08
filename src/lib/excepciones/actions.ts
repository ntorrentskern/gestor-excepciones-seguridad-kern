"use server";

import { neonExcepcionesRepository } from "@/lib/excepciones/db-repository";
import type {
  AmpliarInput,
  DecisionInput,
  ReactivarInput,
} from "@/lib/excepciones/types";
import type {
  EditarExcepcionInput,
  Excepcion,
  ExcepcionFilters,
  NuevaExcepcionInput,
} from "@/types/excepcion";

export async function listExcepciones(
  filters?: ExcepcionFilters
): Promise<Excepcion[]> {
  return neonExcepcionesRepository.list(filters);
}

export async function getExcepcionById(
  id: string
): Promise<Excepcion | null> {
  return neonExcepcionesRepository.getById(id);
}

export async function createExcepcion(
  input: NuevaExcepcionInput
): Promise<Excepcion> {
  return neonExcepcionesRepository.create(input);
}

export async function editarExcepcion(
  id: string,
  input: EditarExcepcionInput
): Promise<Excepcion> {
  return neonExcepcionesRepository.editar(id, input);
}

export async function aprobarExcepcion(
  id: string,
  input?: DecisionInput
): Promise<Excepcion> {
  return neonExcepcionesRepository.aprobar(id, input);
}

export async function rechazarExcepcion(
  id: string,
  input?: DecisionInput
): Promise<Excepcion> {
  return neonExcepcionesRepository.rechazar(id, input);
}

export async function cancelarExcepcion(
  id: string,
  input?: DecisionInput
): Promise<Excepcion> {
  return neonExcepcionesRepository.cancelar(id, input);
}

export async function ampliarExcepcion(
  id: string,
  input: AmpliarInput
): Promise<Excepcion> {
  return neonExcepcionesRepository.ampliar(id, input);
}

export async function reactivarExcepcion(
  id: string,
  input: ReactivarInput
): Promise<Excepcion> {
  return neonExcepcionesRepository.reactivar(id, input);
}
