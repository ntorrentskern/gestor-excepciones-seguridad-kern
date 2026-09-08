import type {
  EditarExcepcionInput,
  Excepcion,
  ExcepcionFilters,
  NuevaExcepcionInput,
} from "@/types/excepcion";

export interface AmpliarInput {
  nuevaFechaRevision: string;
  motivo: string;
  actorEmail?: string;
}

export interface DecisionInput {
  motivo?: string;
  actorEmail?: string;
}

export interface ReactivarInput {
  nuevaFechaRevision: string;
  motivo?: string;
  actorEmail?: string;
}

export interface ExcepcionesRepository {
  list(filters?: ExcepcionFilters): Promise<Excepcion[]>;
  getById(id: string): Promise<Excepcion | null>;
  create(input: NuevaExcepcionInput): Promise<Excepcion>;
  update(id: string, patch: Partial<Excepcion>): Promise<Excepcion>;
  editar(id: string, input: EditarExcepcionInput): Promise<Excepcion>;
  aprobar(id: string, input?: DecisionInput): Promise<Excepcion>;
  rechazar(id: string, input?: DecisionInput): Promise<Excepcion>;
  cancelar(id: string, input?: DecisionInput): Promise<Excepcion>;
  ampliar(id: string, input: AmpliarInput): Promise<Excepcion>;
  reactivar(id: string, input: ReactivarInput): Promise<Excepcion>;
}
