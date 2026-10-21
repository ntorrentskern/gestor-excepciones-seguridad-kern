-- Añade tipo «servicio» a sujetos (CMDB ligera).
-- Seguro de re-ejecutar.

ALTER TABLE sujetos DROP CONSTRAINT IF EXISTS sujetos_tipo_check;

ALTER TABLE sujetos
  ADD CONSTRAINT sujetos_tipo_check
  CHECK (tipo IN ('usuario', 'activo', 'servicio', 'otro'));
