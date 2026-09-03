-- =====================================================
-- FORZA - Migración de contexto de negocio Sep 2026
-- =====================================================
-- Fecha: 2026-09-01
-- Descripción: Tablas y columnas nuevas según contexto del cliente
-- Tickets relacionados: FOR-71, FOR-76, FOR-77 a FOR-84
--
-- IMPORTANTE: Revisar este script antes de ejecutar en Supabase
-- =====================================================

-- =====================================================
-- 1. TABLAS NUEVAS
-- =====================================================

-- -----------------------------------------------
-- trial_sessions (FOR-71)
-- Clases de prueba ($30k) — flujo separado
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.trial_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Datos del niño
  child_name text NOT NULL,

  -- Datos del acudiente
  guardian_name text NOT NULL,
  guardian_whatsapp text NOT NULL,
  guardian_email text NOT NULL,

  -- Clase de prueba
  trial_date date NOT NULL,
  trial_time time NOT NULL,
  location text,

  -- Pago
  payment_status text NOT NULL CHECK (payment_status IN ('pendiente', 'pagado')) DEFAULT 'pendiente',
  amount_paid numeric(10,2) DEFAULT 30000,

  -- Google Calendar
  google_calendar_event_id text,

  -- Conversión a deportista
  converted_to_athlete_id uuid REFERENCES public.athletes(id) ON DELETE SET NULL,

  -- Notas
  notes text,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indices para trial_sessions
CREATE INDEX IF NOT EXISTS idx_trial_sessions_trial_date
  ON public.trial_sessions(trial_date);

CREATE INDEX IF NOT EXISTS idx_trial_sessions_payment_status
  ON public.trial_sessions(payment_status);

CREATE INDEX IF NOT EXISTS idx_trial_sessions_converted
  ON public.trial_sessions(converted_to_athlete_id);

-- RLS para trial_sessions
ALTER TABLE public.trial_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role all" ON public.trial_sessions;
CREATE POLICY "Allow service role all"
  ON public.trial_sessions FOR ALL
  USING (true);

COMMENT ON TABLE public.trial_sessions IS 'Clases de prueba - flujo separado de deportistas con plan';
COMMENT ON COLUMN public.trial_sessions.payment_status IS 'Regla: Solo se da la clase si payment_status = pagado';
COMMENT ON COLUMN public.trial_sessions.converted_to_athlete_id IS 'NULL si no ha convertido, UUID si ya se creó deportista desde este trial';

-- -----------------------------------------------
-- trainer_blocks (FOR-78)
-- Bloqueos de agenda del entrenador
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.trainer_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Entrenador
  trainer_id uuid NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,

  -- Tipo de bloqueo
  block_type text NOT NULL CHECK (block_type IN ('full_day', 'time_range')),

  -- Fecha y horario
  blocked_date date NOT NULL,
  start_time time,  -- nullable si block_type = 'full_day'
  end_time time,    -- nullable si block_type = 'full_day'

  -- Motivo (OBLIGATORIO)
  reason text NOT NULL,

  -- Quién creó el bloqueo (admin o el trainer mismo)
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indices para trainer_blocks
CREATE INDEX IF NOT EXISTS idx_trainer_blocks_trainer_id
  ON public.trainer_blocks(trainer_id);

CREATE INDEX IF NOT EXISTS idx_trainer_blocks_date
  ON public.trainer_blocks(blocked_date);

CREATE INDEX IF NOT EXISTS idx_trainer_blocks_trainer_date
  ON public.trainer_blocks(trainer_id, blocked_date);

-- RLS para trainer_blocks
ALTER TABLE public.trainer_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role all" ON public.trainer_blocks;
CREATE POLICY "Allow service role all"
  ON public.trainer_blocks FOR ALL
  USING (true);

COMMENT ON TABLE public.trainer_blocks IS 'Bloqueos de agenda del entrenador (día completo o rango de horas)';
COMMENT ON COLUMN public.trainer_blocks.reason IS 'Motivo OBLIGATORIO (enfermedad, viaje, etc.)';
COMMENT ON COLUMN public.trainer_blocks.block_type IS 'full_day = día completo bloqueado | time_range = solo un rango de horas';

-- -----------------------------------------------
-- session_reschedule_history (FOR-79)
-- Historial de reprogramaciones (máx 2 por sesión)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_reschedule_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sesión reprogramada
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,

  -- Fecha/hora original
  original_date date NOT NULL,
  original_time time NOT NULL,

  -- Fecha/hora nueva
  new_date date NOT NULL,
  new_time time NOT NULL,

  -- Motivo (OBLIGATORIO)
  reason text NOT NULL,

  -- Quién reprogramó
  rescheduled_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Timestamp
  created_at timestamptz DEFAULT now()
);

-- Indices para session_reschedule_history
CREATE INDEX IF NOT EXISTS idx_reschedule_history_session_id
  ON public.session_reschedule_history(session_id);

CREATE INDEX IF NOT EXISTS idx_reschedule_history_created_at
  ON public.session_reschedule_history(created_at DESC);

-- RLS para session_reschedule_history
ALTER TABLE public.session_reschedule_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role all" ON public.session_reschedule_history;
CREATE POLICY "Allow service role all"
  ON public.session_reschedule_history FOR ALL
  USING (true);

COMMENT ON TABLE public.session_reschedule_history IS 'Historial de reprogramaciones de sesiones (máximo 2 por sesión)';
COMMENT ON COLUMN public.session_reschedule_history.reason IS 'Motivo de la reprogramación (OBLIGATORIO)';

-- -----------------------------------------------
-- notifications (FASE 2 — Cycle 15+)
-- Sistema de notificaciones centralizado
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Usuario que recibe la notificación
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Tipo de notificación
  type text NOT NULL,

  -- Contenido
  title text NOT NULL,
  message text NOT NULL,

  -- Link para navegar (URL interna)
  link text,

  -- Estado
  read boolean DEFAULT false,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_read
  ON public.notifications(read);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON public.notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, read) WHERE read = false;

-- RLS para notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role all" ON public.notifications;
CREATE POLICY "Allow service role all"
  ON public.notifications FOR ALL
  USING (true);

COMMENT ON TABLE public.notifications IS 'Sistema de notificaciones centralizado (campanita) — FASE 2, Cycle 15+';
COMMENT ON COLUMN public.notifications.type IS 'Tipos: evaluation_due, plan_expiring, trainer_blocked, payment_overdue, session_rescheduled, etc.';
COMMENT ON COLUMN public.notifications.link IS 'URL interna para navegar (ej: /deportistas/123)';

-- =====================================================
-- 2. COLUMNAS NUEVAS EN TABLAS EXISTENTES
-- =====================================================

-- -----------------------------------------------
-- athletes (FOR-71, FOR-83)
-- Tracking de origen (trial) + foto de perfil
-- -----------------------------------------------
ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS came_from_trial boolean DEFAULT false;

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS trial_date date;

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS photo_url text;

COMMENT ON COLUMN public.athletes.came_from_trial IS 'Indica si el deportista proviene de una clase de prueba convertida';
COMMENT ON COLUMN public.athletes.trial_date IS 'Fecha de la clase de prueba (para métricas de conversión)';
COMMENT ON COLUMN public.athletes.photo_url IS 'URL de la foto de perfil en Supabase Storage (bucket: avatars)';

-- -----------------------------------------------
-- trainers (FOR-77, FOR-83)
-- Disponibilidad + foto de perfil
-- -----------------------------------------------
ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS coverage_area text;

ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS available_days jsonb;

ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS available_hours_start time;

ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS available_hours_end time;

ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Bogota';

ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS photo_url text;

COMMENT ON COLUMN public.trainers.coverage_area IS 'Zona de cobertura del entrenador (ej: Sur, Centro, Envigado)';
COMMENT ON COLUMN public.trainers.available_days IS 'Array JSON de días disponibles. Ej: ["lunes", "miercoles", "viernes"]';
COMMENT ON COLUMN public.trainers.available_hours_start IS 'Hora de inicio de disponibilidad (ej: 08:00)';
COMMENT ON COLUMN public.trainers.available_hours_end IS 'Hora de fin de disponibilidad (ej: 18:00)';
COMMENT ON COLUMN public.trainers.timezone IS 'Zona horaria del entrenador';
COMMENT ON COLUMN public.trainers.photo_url IS 'URL de la foto de perfil en Supabase Storage (bucket: avatars)';

-- -----------------------------------------------
-- users (FOR-83)
-- Foto de perfil
-- -----------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS photo_url text;

COMMENT ON COLUMN public.users.photo_url IS 'URL de la foto de perfil en Supabase Storage (bucket: avatars)';

-- -----------------------------------------------
-- plans (FOR-80)
-- Extensión manual de planes
-- -----------------------------------------------
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS extended_times int DEFAULT 0;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS extension_notes text;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS original_end_date date;

COMMENT ON COLUMN public.plans.extended_times IS 'Contador de cuántas veces se ha extendido el plan';
COMMENT ON COLUMN public.plans.extension_notes IS 'Registro de extensiones en formato JSON. Incluye: quién, cuándo, días agregados, razón';
COMMENT ON COLUMN public.plans.original_end_date IS 'Fecha de fin original del plan (antes de extensiones). Se guarda al hacer la primera extensión';

-- -----------------------------------------------
-- sessions (FOR-79)
-- Reprogramaciones + cancelaciones
-- -----------------------------------------------
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS reschedule_count int DEFAULT 0;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

COMMENT ON COLUMN public.sessions.reschedule_count IS 'Contador de reprogramaciones (máximo 2). Incrementa automáticamente al reprogramar';
COMMENT ON COLUMN public.sessions.cancellation_reason IS 'Motivo de cancelación (OBLIGATORIO si status = cancelled)';

-- =====================================================
-- 3. TRIGGERS (updated_at)
-- =====================================================

-- Trigger para trial_sessions
CREATE OR REPLACE FUNCTION update_trial_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_trial_sessions_updated_at ON public.trial_sessions;
CREATE TRIGGER trigger_trial_sessions_updated_at
  BEFORE UPDATE ON public.trial_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_trial_sessions_updated_at();

-- Trigger para trainer_blocks
CREATE OR REPLACE FUNCTION update_trainer_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_trainer_blocks_updated_at ON public.trainer_blocks;
CREATE TRIGGER trigger_trainer_blocks_updated_at
  BEFORE UPDATE ON public.trainer_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_trainer_blocks_updated_at();

-- Trigger para notifications
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notifications_updated_at ON public.notifications;
CREATE TRIGGER trigger_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- =====================================================
-- 4. DATOS DE EJEMPLO (OPCIONAL - comentado)
-- =====================================================

/*
-- Ejemplo de available_days en trainers
UPDATE public.trainers
SET available_days = '["lunes", "miercoles", "viernes"]'::jsonb,
    available_hours_start = '08:00'::time,
    available_hours_end = '18:00'::time,
    coverage_area = 'Sur'
WHERE user_id = (SELECT id FROM public.users WHERE email = 'trainer@forza.com');
*/

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================

-- Verificación final
SELECT
  'trial_sessions' as tabla,
  COUNT(*) as registros
FROM public.trial_sessions
UNION ALL
SELECT
  'trainer_blocks',
  COUNT(*)
FROM public.trainer_blocks
UNION ALL
SELECT
  'session_reschedule_history',
  COUNT(*)
FROM public.session_reschedule_history
UNION ALL
SELECT
  'notifications',
  COUNT(*)
FROM public.notifications;
