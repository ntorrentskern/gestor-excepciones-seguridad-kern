-- Esquema Gestor de Excepciones de Seguridad (Neon)

CREATE TABLE IF NOT EXISTS excepciones (
  id TEXT PRIMARY KEY,
  tipo_excepcion TEXT NOT NULL,
  origen_solicitud TEXT NOT NULL
    CHECK (origen_solicitud IN ('Correo', 'Jira', 'Teams', 'Otro')),
  jira_ticket_id TEXT,
  solicitante_email TEXT NOT NULL,
  activo_afectado TEXT NOT NULL,
  justificacion TEXT NOT NULL,
  control_compensatorio TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL
    CHECK (estado IN ('Pendiente', 'Aprobada', 'Rechazada', 'Cancelada', 'Caducada')),
  temporalidad TEXT NOT NULL
    CHECK (temporalidad IN ('Temporal', 'Permanente')),
  fecha_solicitud DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_revision DATE NOT NULL,
  aprobador_email TEXT,
  fecha_decision DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT jira_ticket_cuando_origen_jira CHECK (
    origen_solicitud <> 'Jira'
    OR (jira_ticket_id IS NOT NULL AND length(trim(jira_ticket_id)) > 0)
  )
);

CREATE TABLE IF NOT EXISTS eventos_auditoria (
  id TEXT PRIMARY KEY,
  excepcion_id TEXT NOT NULL REFERENCES excepciones (id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detalle TEXT NOT NULL,
  estado_anterior TEXT,
  estado_nuevo TEXT
);

CREATE INDEX IF NOT EXISTS idx_excepciones_estado
  ON excepciones (estado);

CREATE INDEX IF NOT EXISTS idx_excepciones_fecha_revision
  ON excepciones (fecha_revision);

CREATE INDEX IF NOT EXISTS idx_excepciones_tipo
  ON excepciones (tipo_excepcion);

CREATE INDEX IF NOT EXISTS idx_eventos_excepcion_id
  ON eventos_auditoria (excepcion_id);

CREATE INDEX IF NOT EXISTS idx_eventos_timestamp
  ON eventos_auditoria ("timestamp" DESC);
