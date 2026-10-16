-- FOR-65: intentos configurables (1-4) en evaluación técnica y física
--
-- Técnica: cada test ya usa un score agregado 0..N (número de aciertos). Hoy N es
-- fijo (2 para Control de Balón y Definición, 4 para Pase). Se agrega una columna
-- de "intentos" por test para que N sea configurable entre 1 y 4. Los CHECK
-- existentes sobre los campos de score (tope fijo en 2) se relajan a un tope
-- absoluto de 4; la regla real "score <= intentos" se valida en el backend porque
-- depende de otra columna (no se puede expresar en un CHECK simple).
--
-- Física: Salto Vertical y Salto Horizontal no tenían concepto de intentos (un
-- solo valor en cm). Se agregan columnas de array con los intentos individuales;
-- el valor clasificado (salto_vertical_cm / salto_horizontal_cm) se sigue
-- calculando y guardando en backend, ahora como el máximo de los intentos.

-- 1. Técnica: relajar CHECK de los campos de score de Control y Definición (tope 2 -> 4)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.technical_assessments'::regclass
      AND contype = 'c'
      AND (conname LIKE '%control_%check' OR conname LIKE '%definicion_%check')
  LOOP
    EXECUTE format('ALTER TABLE public.technical_assessments DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.technical_assessments
  ADD CONSTRAINT technical_assessments_control_rastrero_dr_check CHECK (control_rastrero_dr IS NULL OR control_rastrero_dr BETWEEN 0 AND 4),
  ADD CONSTRAINT technical_assessments_control_rastrero_iz_check CHECK (control_rastrero_iz IS NULL OR control_rastrero_iz BETWEEN 0 AND 4),
  ADD CONSTRAINT technical_assessments_control_media_altura_dr_check CHECK (control_media_altura_dr IS NULL OR control_media_altura_dr BETWEEN 0 AND 4),
  ADD CONSTRAINT technical_assessments_control_media_altura_iz_check CHECK (control_media_altura_iz IS NULL OR control_media_altura_iz BETWEEN 0 AND 4),
  ADD CONSTRAINT technical_assessments_control_alto_dr_check CHECK (control_alto_dr IS NULL OR control_alto_dr BETWEEN 0 AND 4),
  ADD CONSTRAINT technical_assessments_control_alto_iz_check CHECK (control_alto_iz IS NULL OR control_alto_iz BETWEEN 0 AND 4),
  ADD CONSTRAINT technical_assessments_definicion_carril_der_dr_check CHECK (definicion_carril_der_dr IS NULL OR definicion_carril_der_dr BETWEEN 0 AND 4),
  ADD CONSTRAINT technical_assessments_definicion_carril_der_iz_check CHECK (definicion_carril_der_iz IS NULL OR definicion_carril_der_iz BETWEEN 0 AND 4),
  ADD CONSTRAINT technical_assessments_definicion_carril_cen_dr_check CHECK (definicion_carril_cen_dr IS NULL OR definicion_carril_cen_dr BETWEEN 0 AND 4),
  ADD CONSTRAINT technical_assessments_definicion_carril_cen_iz_check CHECK (definicion_carril_cen_iz IS NULL OR definicion_carril_cen_iz BETWEEN 0 AND 4),
  ADD CONSTRAINT technical_assessments_definicion_carril_izq_dr_check CHECK (definicion_carril_izq_dr IS NULL OR definicion_carril_izq_dr BETWEEN 0 AND 4),
  ADD CONSTRAINT technical_assessments_definicion_carril_izq_iz_check CHECK (definicion_carril_izq_iz IS NULL OR definicion_carril_izq_iz BETWEEN 0 AND 4);

-- 2. Técnica: columnas de intentos por test (default = comportamiento actual)
ALTER TABLE public.technical_assessments
  ADD COLUMN IF NOT EXISTS control_intentos    integer NOT NULL DEFAULT 2 CHECK (control_intentos BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS pase_intentos       integer NOT NULL DEFAULT 4 CHECK (pase_intentos BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS definicion_intentos integer NOT NULL DEFAULT 2 CHECK (definicion_intentos BETWEEN 1 AND 4);

-- 3. Física: arrays de intentos de salto (valores individuales en cm)
ALTER TABLE public.physical_assessments
  ADD COLUMN IF NOT EXISTS salto_vertical_valores   numeric(5,2)[],
  ADD COLUMN IF NOT EXISTS salto_horizontal_valores numeric(5,2)[];

-- Verificación
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'technical_assessments'
  AND column_name IN ('control_intentos', 'pase_intentos', 'definicion_intentos');

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'physical_assessments'
  AND column_name IN ('salto_vertical_valores', 'salto_horizontal_valores');
