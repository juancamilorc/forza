-- FOR-71: módulo de clases de prueba
--
-- La tabla trial_sessions ya existe (vacía). Se ajusta para el flujo del ticket:
--   * trainer_id: entrenador asignado a la clase de prueba
--   * status: programada | cancelada (reprogramar = editar fecha/hora)
--   * amount_paid: pasa a ser "monto recibido" (0 pendiente, 35000 pagado); el precio
--     fijo de $35.000 vive en el backend, no en la BD
--   * guardian_email: opcional (el contacto real es el WhatsApp)

ALTER TABLE public.trial_sessions
  ADD COLUMN IF NOT EXISTS trainer_id uuid REFERENCES public.trainers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'programada';

ALTER TABLE public.trial_sessions
  DROP CONSTRAINT IF EXISTS trial_sessions_status_check;
ALTER TABLE public.trial_sessions
  ADD CONSTRAINT trial_sessions_status_check CHECK (status IN ('programada', 'cancelada'));

ALTER TABLE public.trial_sessions ALTER COLUMN amount_paid SET DEFAULT 0;
ALTER TABLE public.trial_sessions ALTER COLUMN guardian_email DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trial_sessions_trainer ON public.trial_sessions (trainer_id);
CREATE INDEX IF NOT EXISTS idx_trial_sessions_status  ON public.trial_sessions (status);

-- Verificación
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'trial_sessions'
  AND column_name IN ('trainer_id', 'status', 'amount_paid', 'guardian_email');
