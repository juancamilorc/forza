-- =====================================================
-- FORZA - Backfill de gender en deportistas (FOR-85)
-- =====================================================
-- Fecha: 2026-09-09
-- Descripción:
--   Antes de FOR-85, athletes.create() descartaba el campo gender, así que
--   todo deportista creado desde el formulario quedó con gender = NULL.
--   El género NO se puede inferir automáticamente: hay que asignarlo a mano
--   deportista por deportista (o reeditándolos en la app, que ya lo persiste).
--
-- IMPORTANTE: la sección 2 es una PLANTILLA. Completar los valores reales
-- antes de ejecutar. Revisar en Supabase.
-- =====================================================

-- 1. Diagnóstico: deportistas sin género
SELECT id, first_name, last_name, birth_date, status, created_at
FROM public.athletes
WHERE gender IS NULL
ORDER BY created_at;

-- 2. Asignación manual (rellenar con 'M' o 'F' según cada deportista).
--    Repetir una línea por deportista usando los id del paso 1.
--
-- UPDATE public.athletes SET gender = 'M' WHERE id = '00000000-0000-0000-0000-000000000000';
-- UPDATE public.athletes SET gender = 'F' WHERE id = '00000000-0000-0000-0000-000000000000';

-- 3. Verificación: no deben quedar deportistas sin género
SELECT count(*) AS sin_genero
FROM public.athletes
WHERE gender IS NULL;
