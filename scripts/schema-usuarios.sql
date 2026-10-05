-- Usuarios de la aplicación (login propio; roles locales hasta Entra ID)

CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL DEFAULT '',
  apellidos TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'helpdesk'
    CHECK (rol IN ('seguridad', 'sistemas', 'helpdesk')),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios (rol);
