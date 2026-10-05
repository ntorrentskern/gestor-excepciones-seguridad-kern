-- Esquema Gestor de Excepciones (Neon)

CREATE TABLE IF NOT EXISTS excepciones (
  id TEXT PRIMARY KEY,
  dominio TEXT NOT NULL DEFAULT 'seguridad'
    CHECK (dominio IN ('seguridad', 'sistemas', 'helpdesk')),
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

CREATE INDEX IF NOT EXISTS idx_excepciones_dominio
  ON excepciones (dominio);

CREATE INDEX IF NOT EXISTS idx_eventos_excepcion_id
  ON eventos_auditoria (excepcion_id);

CREATE INDEX IF NOT EXISTS idx_eventos_timestamp
  ON eventos_auditoria ("timestamp" DESC);

-- Sujetos correlacionables (Usuario, Activo, Otro)
CREATE TABLE IF NOT EXISTS sujetos (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL
    CHECK (tipo IN ('usuario', 'activo', 'otro')),
  clave TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sujetos_tipo_clave
  ON sujetos (tipo, lower(clave));

CREATE INDEX IF NOT EXISTS idx_sujetos_clave_lower
  ON sujetos (lower(clave));

CREATE INDEX IF NOT EXISTS idx_sujetos_display_lower
  ON sujetos (lower(display_name));

CREATE TABLE IF NOT EXISTS excepcion_sujeto (
  excepcion_id TEXT NOT NULL REFERENCES excepciones (id) ON DELETE CASCADE,
  sujeto_id TEXT NOT NULL REFERENCES sujetos (id) ON DELETE CASCADE,
  rol_vinculo TEXT NOT NULL DEFAULT 'afectado',
  PRIMARY KEY (excepcion_id, sujeto_id)
);

CREATE INDEX IF NOT EXISTS idx_excepcion_sujeto_sujeto
  ON excepcion_sujeto (sujeto_id);

-- Eventos operativos (baja / cambio dispositivo)
CREATE TABLE IF NOT EXISTS eventos_operativos (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL
    CHECK (tipo IN ('BajaUsuario', 'CambioDispositivo')),
  sujeto_id TEXT NOT NULL REFERENCES sujetos (id) ON DELETE CASCADE,
  actor_email TEXT NOT NULL,
  notas TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Abierto'
    CHECK (estado IN ('Abierto', 'Cerrado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_eventos_operativos_sujeto
  ON eventos_operativos (sujeto_id);

CREATE TABLE IF NOT EXISTS evento_operativo_excepcion (
  evento_id TEXT NOT NULL REFERENCES eventos_operativos (id) ON DELETE CASCADE,
  excepcion_id TEXT NOT NULL REFERENCES excepciones (id) ON DELETE CASCADE,
  revisada BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (evento_id, excepcion_id)
);
