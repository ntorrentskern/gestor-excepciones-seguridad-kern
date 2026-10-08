export const TIPOS_EVENTO_OPERATIVO = [
  "BajaUsuario",
  "CambioDispositivo",
] as const;

export type TipoEventoOperativo = (typeof TIPOS_EVENTO_OPERATIVO)[number];

export const TIPO_EVENTO_OPERATIVO_LABELS: Record<TipoEventoOperativo, string> =
  {
    BajaUsuario: "Baja de usuario",
    CambioDispositivo: "Cambio de dispositivo",
  };

export type EventoOperativo = {
  id: string;
  tipo: TipoEventoOperativo;
  sujeto_id: string;
  actor_email: string;
  notas: string;
  estado: "Abierto" | "Cerrado";
  created_at: string;
  closed_at: string | null;
};

export type EventoOperativoListItem = EventoOperativo & {
  sujeto_display: string;
  sujeto_tipo: string;
  sujeto_clave: string;
  total_excepciones: number;
  pendientes_revision: number;
};

export type EventoOperativoDetalle = EventoOperativo & {
  excepciones: Array<{
    id: string;
    tipo_excepcion: string;
    dominio: string;
    estado: string;
    revisada: boolean;
    solicitante_email: string;
    activo_afectado: string;
  }>;
};
