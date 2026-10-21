-- Vista de resumen CMDB (opcional, aditiva e idempotente).
-- No altera datos. Aplicar con: psql "$DATABASE_URL" -f scripts/migrate-cmdb-view.sql

CREATE OR REPLACE VIEW cmdb_resumen_v AS
SELECT
  s.id AS sujeto_id,
  s.tipo,
  s.clave,
  s.display_name,
  s.is_sandbox,
  count(DISTINCT e.id)::int AS total_excepciones,
  count(DISTINCT e.id) FILTER (
    WHERE e.estado IN ('Pendiente', 'Aprobada')
  )::int AS activas,
  count(DISTINCT e.id) FILTER (WHERE e.estado = 'Pendiente')::int AS pendientes,
  count(DISTINCT e.id) FILTER (WHERE e.estado = 'Caducada')::int AS caducadas
FROM sujetos s
LEFT JOIN excepcion_sujeto es ON es.sujeto_id = s.id
LEFT JOIN excepciones e ON e.id = es.excepcion_id AND e.is_sandbox = s.is_sandbox
WHERE s.tipo IN ('usuario', 'activo', 'servicio')
GROUP BY s.id, s.tipo, s.clave, s.display_name, s.is_sandbox;
