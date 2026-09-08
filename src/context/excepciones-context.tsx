"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  excepcionesRepository,
  type AmpliarInput,
  type DecisionInput,
  type ReactivarInput,
} from "@/lib/excepciones/repository";
import {
  esActiva,
  requiereAtencionRevision,
} from "@/lib/excepciones/utils";
import type {
  Excepcion,
  ExcepcionFilters,
  NuevaExcepcionInput,
} from "@/types/excepcion";

interface ExcepcionesContextValue {
  excepciones: Excepcion[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getById: (id: string) => Excepcion | undefined;
  create: (input: NuevaExcepcionInput) => Promise<Excepcion>;
  aprobar: (id: string, input?: DecisionInput) => Promise<Excepcion>;
  rechazar: (id: string, input?: DecisionInput) => Promise<Excepcion>;
  cancelar: (id: string, input?: DecisionInput) => Promise<Excepcion>;
  ampliar: (id: string, input: AmpliarInput) => Promise<Excepcion>;
  reactivar: (id: string, input: ReactivarInput) => Promise<Excepcion>;
  filter: (filters: ExcepcionFilters) => Excepcion[];
  stats: {
    totalActivas: number;
    pendientes: number;
    proximasRevision: number;
  };
  proximasRevision: Excepcion[];
}

const ExcepcionesContext = createContext<ExcepcionesContextValue | null>(null);

function replaceInList(list: Excepcion[], updated: Excepcion): Excepcion[] {
  return list.map((item) => (item.id === updated.id ? updated : item));
}

export function ExcepcionesProvider({ children }: { children: ReactNode }) {
  const [excepciones, setExcepciones] = useState<Excepcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await excepcionesRepository.list();
      setExcepciones(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar excepciones"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getById = useCallback(
    (id: string) => excepciones.find((e) => e.id === id),
    [excepciones]
  );

  const create = useCallback(async (input: NuevaExcepcionInput) => {
    const created = await excepcionesRepository.create(input);
    setExcepciones((prev) => [created, ...prev]);
    return created;
  }, []);

  const aprobar = useCallback(async (id: string, input?: DecisionInput) => {
    const updated = await excepcionesRepository.aprobar(id, input);
    setExcepciones((prev) => replaceInList(prev, updated));
    return updated;
  }, []);

  const rechazar = useCallback(async (id: string, input?: DecisionInput) => {
    const updated = await excepcionesRepository.rechazar(id, input);
    setExcepciones((prev) => replaceInList(prev, updated));
    return updated;
  }, []);

  const cancelar = useCallback(async (id: string, input?: DecisionInput) => {
    const updated = await excepcionesRepository.cancelar(id, input);
    setExcepciones((prev) => replaceInList(prev, updated));
    return updated;
  }, []);

  const ampliar = useCallback(async (id: string, input: AmpliarInput) => {
    const updated = await excepcionesRepository.ampliar(id, input);
    setExcepciones((prev) => replaceInList(prev, updated));
    return updated;
  }, []);

  const reactivar = useCallback(async (id: string, input: ReactivarInput) => {
    const updated = await excepcionesRepository.reactivar(id, input);
    setExcepciones((prev) => replaceInList(prev, updated));
    return updated;
  }, []);

  const filter = useCallback(
    (filters: ExcepcionFilters) => {
      const q = filters.busqueda?.trim().toLowerCase();
      return excepciones.filter((item) => {
        if (
          filters.estado &&
          filters.estado !== "Todos" &&
          item.estado !== filters.estado
        ) {
          return false;
        }
        if (
          filters.tipo_excepcion &&
          filters.tipo_excepcion !== "Todos" &&
          item.tipo_excepcion !== filters.tipo_excepcion
        ) {
          return false;
        }
        if (q) {
          const blob = [
            item.id,
            item.tipo_excepcion,
            item.origen_peticion,
            item.solicitante_email,
            item.activo_afectado,
            item.justificacion,
            item.aprobador_email ?? "",
          ]
            .join(" ")
            .toLowerCase();
          if (!blob.includes(q)) return false;
        }
        return true;
      });
    },
    [excepciones]
  );

  const proximasRevision = useMemo(
    () =>
      excepciones
        .filter((e) => requiereAtencionRevision(e, 14))
        .sort((a, b) => a.fecha_revision.localeCompare(b.fecha_revision)),
    [excepciones]
  );

  const stats = useMemo(
    () => ({
      totalActivas: excepciones.filter(esActiva).length,
      pendientes: excepciones.filter((e) => e.estado === "Pendiente").length,
      proximasRevision: proximasRevision.length,
    }),
    [excepciones, proximasRevision.length]
  );

  const value = useMemo(
    () => ({
      excepciones,
      loading,
      error,
      refresh,
      getById,
      create,
      aprobar,
      rechazar,
      cancelar,
      ampliar,
      reactivar,
      filter,
      stats,
      proximasRevision,
    }),
    [
      excepciones,
      loading,
      error,
      refresh,
      getById,
      create,
      aprobar,
      rechazar,
      cancelar,
      ampliar,
      reactivar,
      filter,
      stats,
      proximasRevision,
    ]
  );

  return (
    <ExcepcionesContext.Provider value={value}>
      {children}
    </ExcepcionesContext.Provider>
  );
}

export function useExcepciones() {
  const ctx = useContext(ExcepcionesContext);
  if (!ctx) {
    throw new Error("useExcepciones debe usarse dentro de ExcepcionesProvider");
  }
  return ctx;
}
