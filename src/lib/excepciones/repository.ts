/**
 * Fachada de acceso a datos de excepciones (Neon via Server Actions).
 */

import {
  ampliarExcepcion,
  aprobarExcepcion,
  cancelarExcepcion,
  comentarExcepcion,
  createExcepcion,
  createExcepciones,
  editarExcepcion,
  getExcepcionById,
  listExcepciones,
  reactivarExcepcion,
  rechazarExcepcion,
} from "@/lib/excepciones/actions";
import type { ExcepcionesRepository } from "@/lib/excepciones/types";

export type {
  AmpliarInput,
  ComentarInput,
  DecisionInput,
  ExcepcionesRepository,
  ReactivarInput,
} from "@/lib/excepciones/types";

export { fechaAmpliacionPorDefecto } from "@/lib/excepciones/utils";

/** Alta de varias excepciones (un ID por usuario–PC), en serie para no repetir ID. */
export const createExcepcionesEnBloque = createExcepciones;

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
  comentar: comentarExcepcion,
};
