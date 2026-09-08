/**
 * Fachada de acceso a datos de excepciones (Neon via Server Actions).
 */

import {
  ampliarExcepcion,
  aprobarExcepcion,
  cancelarExcepcion,
  createExcepcion,
  editarExcepcion,
  getExcepcionById,
  listExcepciones,
  reactivarExcepcion,
  rechazarExcepcion,
} from "@/lib/excepciones/actions";
import type { ExcepcionesRepository } from "@/lib/excepciones/types";

export type {
  AmpliarInput,
  DecisionInput,
  ExcepcionesRepository,
  ReactivarInput,
} from "@/lib/excepciones/types";

export { fechaAmpliacionPorDefecto } from "@/lib/excepciones/utils";

export const excepcionesRepository: ExcepcionesRepository = {
  list: listExcepciones,
  getById: getExcepcionById,
  create: createExcepcion,
  update: async () => {
    throw new Error("update directo no expuesto; usa editar.");
  },
  editar: editarExcepcion,
  aprobar: aprobarExcepcion,
  rechazar: rechazarExcepcion,
  cancelar: cancelarExcepcion,
  ampliar: ampliarExcepcion,
  reactivar: reactivarExcepcion,
};
