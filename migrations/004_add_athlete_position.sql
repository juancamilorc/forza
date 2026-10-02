-- =====================================================
-- FORZA - Agregar posición de juego a deportistas (FOR-69)
-- =====================================================
-- Fecha: 2026-10-02
-- Descripción:
--   FOR-69 (banner de campos faltantes en detalle deportista) necesita
--   saber si falta la posición del jugador. No existía ninguna columna
--   para esto — se agrega como texto libre, opcional.
-- =====================================================

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS position text;

-- Verificación
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'athletes' AND column_name = 'position';
