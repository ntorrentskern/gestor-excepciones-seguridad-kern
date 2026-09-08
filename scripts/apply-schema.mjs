import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL && !process.env.STORAGE_DATABASE_URL) {
  console.error("Falta DATABASE_URL o STORAGE_DATABASE_URL");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL ?? process.env.STORAGE_DATABASE_URL);

await sql`
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
  )
`;
console.log("OK: tabla excepciones");

await sql`
  CREATE TABLE IF NOT EXISTS eventos_auditoria (
    id TEXT PRIMARY KEY,
    excepcion_id TEXT NOT NULL REFERENCES excepciones (id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    actor_email TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    detalle TEXT NOT NULL,
    estado_anterior TEXT,
    estado_nuevo TEXT
  )
`;
console.log("OK: tabla eventos_auditoria");

await sql`CREATE INDEX IF NOT EXISTS idx_excepciones_estado ON excepciones (estado)`;
await sql`CREATE INDEX IF NOT EXISTS idx_excepciones_fecha_revision ON excepciones (fecha_revision)`;
await sql`CREATE INDEX IF NOT EXISTS idx_excepciones_tipo ON excepciones (tipo_excepcion)`;
await sql`CREATE INDEX IF NOT EXISTS idx_eventos_excepcion_id ON eventos_auditoria (excepcion_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_eventos_timestamp ON eventos_auditoria ("timestamp" DESC)`;
console.log("OK: índices");

const tables = await sql`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name
`;
console.log(
  "Tablas:",
  tables.map((t) => t.table_name).join(", ")
);
