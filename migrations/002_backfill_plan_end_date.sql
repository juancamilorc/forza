-- =====================================================
-- FORZA - Backfill de end_date en planes (FOR-86)
-- =====================================================
-- Fecha: 2026-09-09
-- Descripción:
--   Antes de FOR-86, plans.end_date nunca se calculaba y quedaba en NULL.
--   Regla de negocio (confirmada, uniforme para todos los tipos de plan):
--     end_date = start_date + 1 mes + 1 semana
--   El "+ 1 mes" de Postgres ya recorta al último día del mes destino
--   (ej: 31-ene + 1 mes = 28-feb), igual que el cálculo del backend.
--
-- IMPORTANTE: Revisar antes de ejecutar en Supabase. Idempotente.
-- =====================================================

-- 1. Diagnóstico: planes sin end_date
SELECT id, athlete_id, plan_type, start_date, end_date
FROM public.plans
WHERE end_date IS NULL;

-- 2. Backfill (solo toca filas con end_date NULL)
UPDATE public.plans
SET end_date = (start_date + INTERVAL '1 month' + INTERVAL '7 days')::date
WHERE end_date IS NULL;

-- 3. Verificación: no deben quedar filas y las fechas deben cuadrar
SELECT id, start_date, end_date,
       (start_date + INTERVAL '1 month' + INTERVAL '7 days')::date AS esperado
FROM public.plans
WHERE end_date IS DISTINCT FROM (start_date + INTERVAL '1 month' + INTERVAL '7 days')::date;
