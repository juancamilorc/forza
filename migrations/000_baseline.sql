-- =====================================================================
-- FORZA - Esquema base (baseline)
-- =====================================================================
-- Generado con pg_dump --schema-only del esquema public y ajustado a mano
-- para poder aplicarse en un proyecto de Supabase NUEVO.
--
-- QUÉ INCLUYE
--   Equivale al estado que dejan las migraciones 001 a 006. Para un proyecto
--   nuevo NO se aplican 001-006 (la 001 crearía políticas USING (true)) ni
--   002-003 (son correcciones de datos).
--
-- ORDEN DE APLICACIÓN EN UN PROYECTO NUEVO
--   1. Este archivo (000_baseline.sql), completo y en una sola ejecución.
--   2. 007_cerrar_acceso_anon.sql (RLS sin políticas y sin privilegios para
--      anon/authenticated; el dump no trae privilegios, así que es obligatoria).
--   3. 008_permisos_service_role.sql (permisos solo para service_role; obligatoria
--      si el proyecto tiene "Automatically expose new tables" desactivado).
--   4. Migraciones posteriores (009 en adelante), también en la base real.
--
-- AJUSTES RESPECTO AL DUMP
--   - Sin \restrict / \unrestrict (comandos de psql que fallan en el editor
--     SQL de Supabase). pg_dump los agrega siempre: al regenerar el archivo,
--     quitarlos con
--         sed -i '' -E '/^\\(un)?restrict /d' migrations/000_baseline.sql
--   - Sin CREATE SCHEMA public ni su COMMENT (ya existe en Supabase).
--   - Sin SET transaction_timeout (solo existe en Postgres 17) ni el
--     set_config de search_path vacío.
--   - Con CREATE EXTENSION uuid-ossp en el esquema extensions (los defaults
--     de varias tablas usan extensions.uuid_generate_v4()).
--   - Sin la tabla appointments ni sus tipos, trigger y claves (módulo eliminado).
--   - Comentarios internos neutralizados.
-- =====================================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

--
-- Name: assessment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.assessment_type AS ENUM (
    'technical',
    'physical',
    'nutritional'
);


--
-- Name: athlete_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.athlete_status AS ENUM (
    'active',
    'inactive',
    'trial'
);


--
-- Name: confirmation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.confirmation_status AS ENUM (
    'pending',
    'partial',
    'verified',
    'conflict'
);


--
-- Name: plan_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.plan_type AS ENUM (
    'momentum',
    'momentum_pro',
    'master',
    'master_pro',
    'frz',
    'frz_pro',
    'elite',
    'elite_pro',
    'addicted_to_football'
);


--
-- Name: session_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.session_status AS ENUM (
    'pending',
    'completed',
    'cancelled'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'super_admin',
    'admin',
    'trainer',
    'nutritionist'
);


--
-- Name: set_plan_end_date(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_plan_end_date() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.end_date is null or new.end_date = new.start_date then
    new.end_date = new.start_date + interval '1 month' + interval '1 week';
  end if;
  return new;
end;
$$;


--
-- Name: set_session_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_session_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.session_number = (
    select count(*) + 1
    from public.sessions
    where plan_id = new.plan_id
  );
  return new;
end;
$$;


--
-- Name: update_confirmation_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_confirmation_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.confirmation_status =
    case
      when new.confirmed_by_trainer = false and new.confirmed_by_guardian = false
        then 'pending'::confirmation_status
      when new.confirmed_by_trainer = true and new.confirmed_by_guardian = false
        then 'partial'::confirmation_status
      when new.confirmed_by_trainer = true and new.confirmed_by_guardian = true
        then 'verified'::confirmation_status
      when new.confirmed_by_trainer = true and new.confirmed_by_guardian = false
        then 'conflict'::confirmation_status
      else 'pending'::confirmation_status
    end;
  return new;
end;
$$;


--
-- Name: update_notifications_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_notifications_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_trainer_blocks_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_trainer_blocks_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_trial_sessions_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_trial_sessions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: athletes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.athletes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    trainer_id uuid,
    first_name text NOT NULL,
    last_name text NOT NULL,
    birth_date date NOT NULL,
    status public.athlete_status DEFAULT 'trial'::public.athlete_status NOT NULL,
    photo_url text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    gender text,
    came_from_trial boolean DEFAULT false,
    trial_date date,
    "position" text,
    CONSTRAINT athletes_gender_check CHECK ((gender = ANY (ARRAY['M'::text, 'F'::text])))
);


--
-- Name: COLUMN athletes.photo_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.athletes.photo_url IS 'URL de la foto de perfil en Supabase Storage (bucket: avatars)';


--
-- Name: COLUMN athletes.came_from_trial; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.athletes.came_from_trial IS 'Indica si el deportista proviene de una clase de prueba convertida';


--
-- Name: COLUMN athletes.trial_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.athletes.trial_date IS 'Fecha de la clase de prueba (para métricas de conversión)';


--
-- Name: guardians; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guardians (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    athlete_id uuid NOT NULL,
    full_name text NOT NULL,
    whatsapp_phone text NOT NULL,
    email text,
    relationship text,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notifications IS 'Sistema de notificaciones centralizado (campanita)';


--
-- Name: COLUMN notifications.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notifications.type IS 'Tipos: evaluation_due, plan_expiring, trainer_blocked, payment_overdue, session_rescheduled, etc.';


--
-- Name: COLUMN notifications.link; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notifications.link IS 'URL interna para navegar (ej: /deportistas/123)';


--
-- Name: nutritional_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutritional_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    athlete_id uuid NOT NULL,
    evaluator_id uuid NOT NULL,
    evaluation_date date NOT NULL,
    period_label text,
    "position" text,
    peso_kg numeric(5,2),
    talla_cm numeric(5,2),
    perimetro_muneca_cm numeric(5,2),
    pliegue_tricipital_mm numeric(5,2),
    pliegue_subescapular_mm numeric(5,2),
    pliegue_supraespinal_mm numeric(5,2),
    pliegue_abdominal_mm numeric(5,2),
    pliegue_muslo_mm numeric(5,2),
    pliegue_pantorrilla_mm numeric(5,2),
    perimetro_pantorrilla_cm numeric(5,2),
    perimetro_brazo_tenso_cm numeric(5,2),
    perimetro_brazo_cm numeric(5,2),
    diametro_humero_cm numeric(5,2),
    diametro_femur_cm numeric(5,2),
    sumatoria_pliegues_mm numeric(6,2),
    porcentaje_grasa numeric(5,2),
    peso_graso_kg numeric(5,2),
    masa_libre_grasa_kg numeric(5,2),
    iaks numeric(5,3),
    imlg numeric(5,3),
    complexion_osea numeric(5,3),
    peso_ideal_kg numeric(5,2),
    imc numeric(5,2),
    porcentaje_grasa_deseado numeric(5,2),
    clasificacion_grasa text,
    clasificacion_iaks text,
    clasificacion_pliegues text,
    clasificacion_imc text,
    clasificacion_talla_edad text,
    horario_entrenamiento text,
    plan_desayuno text,
    plan_media_manana text,
    plan_almuerzo text,
    plan_media_tarde text,
    plan_cena text,
    plan_finde text,
    clasificacion_antropometrica text,
    recomendaciones text,
    notas_comparacion text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT nutritional_assessments_clasificacion_grasa_check CHECK ((clasificacion_grasa = ANY (ARRAY['bajo'::text, 'adecuado'::text, 'aceptable'::text, 'alto'::text]))),
    CONSTRAINT nutritional_assessments_clasificacion_iaks_check CHECK ((clasificacion_iaks = ANY (ARRAY['bajo'::text, 'adecuado'::text, 'aceptable'::text, 'alto'::text]))),
    CONSTRAINT nutritional_assessments_clasificacion_pliegues_check CHECK ((clasificacion_pliegues = ANY (ARRAY['bajo'::text, 'adecuado'::text, 'aceptable'::text, 'alto'::text])))
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    athlete_id uuid NOT NULL,
    plan_id uuid,
    amount numeric(10,2) NOT NULL,
    amount_paid numeric(10,2) DEFAULT 0,
    payment_date date,
    due_date date,
    method text,
    status text DEFAULT 'pendiente'::text,
    notes text,
    registered_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    referencia text,
    cuota_numero integer,
    cuotas_total integer DEFAULT 1 NOT NULL,
    CONSTRAINT payments_method_check CHECK ((method = ANY (ARRAY['transferencia'::text, 'efectivo'::text, 'otro'::text]))),
    CONSTRAINT payments_status_check CHECK ((status = ANY (ARRAY['pendiente'::text, 'parcial'::text, 'pagado'::text])))
);


--
-- Name: physical_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.physical_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    athlete_id uuid NOT NULL,
    evaluator_id uuid NOT NULL,
    evaluation_date date NOT NULL,
    period_label text,
    movilidad_pies integer,
    movilidad_pies_analisis text,
    movilidad_rodillas integer,
    movilidad_rodillas_analisis text,
    movilidad_talones integer,
    movilidad_talones_analisis text,
    movilidad_cadera integer,
    movilidad_cadera_analisis text,
    movilidad_tronco integer,
    movilidad_tronco_analisis text,
    movilidad_brazos integer,
    movilidad_brazos_analisis text,
    movilidad_clasificacion text,
    movilidad_notas text,
    sentadilla_foto_url text,
    salto_vertical_cm numeric(5,2),
    salto_vertical_clasificacion text,
    salto_vertical_notas text,
    salto_horizontal_cm numeric(5,2),
    salto_horizontal_clasificacion text,
    salto_horizontal_notas text,
    sprint_5m numeric(5,3),
    sprint_10m numeric(5,3),
    sprint_15m numeric(5,3),
    sprint_20m numeric(5,3),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    salto_vertical_valores numeric(5,2)[],
    salto_horizontal_valores numeric(5,2)[],
    CONSTRAINT physical_assessments_movilidad_brazos_check CHECK (((movilidad_brazos >= 0) AND (movilidad_brazos <= 3))),
    CONSTRAINT physical_assessments_movilidad_cadera_check CHECK (((movilidad_cadera >= 0) AND (movilidad_cadera <= 3))),
    CONSTRAINT physical_assessments_movilidad_clasificacion_check CHECK ((movilidad_clasificacion = ANY (ARRAY['excelente'::text, 'bueno'::text, 'promedio'::text, 'debajo_promedio'::text]))),
    CONSTRAINT physical_assessments_movilidad_pies_check CHECK (((movilidad_pies >= 0) AND (movilidad_pies <= 3))),
    CONSTRAINT physical_assessments_movilidad_rodillas_check CHECK (((movilidad_rodillas >= 0) AND (movilidad_rodillas <= 3))),
    CONSTRAINT physical_assessments_movilidad_talones_check CHECK (((movilidad_talones >= 0) AND (movilidad_talones <= 3))),
    CONSTRAINT physical_assessments_movilidad_tronco_check CHECK (((movilidad_tronco >= 0) AND (movilidad_tronco <= 3))),
    CONSTRAINT physical_assessments_salto_horizontal_clasificacion_check CHECK ((salto_horizontal_clasificacion = ANY (ARRAY['excelente'::text, 'bueno'::text, 'promedio'::text, 'debajo_promedio'::text]))),
    CONSTRAINT physical_assessments_salto_vertical_clasificacion_check CHECK ((salto_vertical_clasificacion = ANY (ARRAY['excelente'::text, 'bueno'::text, 'promedio'::text, 'debajo_promedio'::text])))
);


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    athlete_id uuid NOT NULL,
    plan_type public.plan_type NOT NULL,
    total_sessions integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_frozen boolean DEFAULT false,
    frozen_at timestamp with time zone,
    frozen_reason text,
    extended_times integer DEFAULT 0,
    extension_notes text,
    original_end_date date
);


--
-- Name: COLUMN plans.extended_times; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plans.extended_times IS 'Contador de cuántas veces se ha extendido el plan';


--
-- Name: COLUMN plans.extension_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plans.extension_notes IS 'Registro de extensiones en formato JSON. Incluye: quién, cuándo, días agregados, razón';


--
-- Name: COLUMN plans.original_end_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plans.original_end_date IS 'Fecha de fin original del plan (antes de extensiones). Se guarda al hacer la primera extensión';


--
-- Name: session_reschedule_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_reschedule_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    original_date date NOT NULL,
    original_time time without time zone NOT NULL,
    new_date date NOT NULL,
    new_time time without time zone NOT NULL,
    reason text NOT NULL,
    rescheduled_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE session_reschedule_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.session_reschedule_history IS 'Historial de reprogramaciones de sesiones (máximo 2 por sesión)';


--
-- Name: COLUMN session_reschedule_history.reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.session_reschedule_history.reason IS 'Motivo de la reprogramación (OBLIGATORIO)';


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    plan_id uuid,
    trainer_id uuid NOT NULL,
    athlete_id uuid NOT NULL,
    session_number integer NOT NULL,
    session_date date NOT NULL,
    session_time time without time zone NOT NULL,
    location text NOT NULL,
    status public.session_status DEFAULT 'pending'::public.session_status NOT NULL,
    confirmation_status public.confirmation_status DEFAULT 'pending'::public.confirmation_status NOT NULL,
    confirmed_by_trainer boolean DEFAULT false NOT NULL,
    confirmed_by_guardian boolean DEFAULT false NOT NULL,
    confirmation_token uuid DEFAULT extensions.uuid_generate_v4(),
    token_expires_at timestamp with time zone DEFAULT (now() + '72:00:00'::interval),
    trainer_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    session_name text,
    cancellation_reason text,
    reschedule_count integer DEFAULT 0,
    rescheduled_from uuid,
    CONSTRAINT sessions_cancellation_reason_check CHECK ((cancellation_reason = ANY (ARRAY['cambio_climatico'::text, 'entrenador'::text, 'usuario'::text])))
);


--
-- Name: COLUMN sessions.cancellation_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sessions.cancellation_reason IS 'Motivo de cancelación (OBLIGATORIO si status = cancelled)';


--
-- Name: COLUMN sessions.reschedule_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sessions.reschedule_count IS 'Contador de reprogramaciones (máximo 2). Incrementa automáticamente al reprogramar';


--
-- Name: technical_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.technical_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    athlete_id uuid NOT NULL,
    evaluator_id uuid NOT NULL,
    evaluation_date date NOT NULL,
    period_label text,
    conduccion_5m numeric(5,3),
    conduccion_10m numeric(5,3),
    conduccion_20m numeric(5,3),
    cambios_direccion_derecha numeric(5,3),
    cambios_direccion_izquierda numeric(5,3),
    control_rastrero_dr integer,
    control_rastrero_iz integer,
    control_media_altura_dr integer,
    control_media_altura_iz integer,
    control_alto_dr integer,
    control_alto_iz integer,
    control_clasificacion text,
    control_notas text,
    pase_derecha integer,
    pase_izquierda integer,
    pase_clasificacion text,
    pase_notas text,
    definicion_carril_der_dr integer,
    definicion_carril_der_iz integer,
    definicion_carril_cen_dr integer,
    definicion_carril_cen_iz integer,
    definicion_carril_izq_dr integer,
    definicion_carril_izq_iz integer,
    definicion_clasificacion text,
    definicion_notas text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    control_efectividad_derecha_pct integer,
    control_efectividad_izquierda_pct integer,
    definicion_efectividad_dr_pct integer,
    definicion_efectividad_iz_pct integer,
    control_efectividad_total_pct integer,
    pase_efectividad_pct integer,
    definicion_efectividad_total_pct integer,
    control_intentos integer DEFAULT 2 NOT NULL,
    pase_intentos integer DEFAULT 4 NOT NULL,
    definicion_intentos integer DEFAULT 2 NOT NULL,
    CONSTRAINT technical_assessments_control_alto_dr_check CHECK (((control_alto_dr IS NULL) OR ((control_alto_dr >= 0) AND (control_alto_dr <= 4)))),
    CONSTRAINT technical_assessments_control_alto_iz_check CHECK (((control_alto_iz IS NULL) OR ((control_alto_iz >= 0) AND (control_alto_iz <= 4)))),
    CONSTRAINT technical_assessments_control_intentos_check CHECK (((control_intentos >= 1) AND (control_intentos <= 4))),
    CONSTRAINT technical_assessments_control_media_altura_dr_check CHECK (((control_media_altura_dr IS NULL) OR ((control_media_altura_dr >= 0) AND (control_media_altura_dr <= 4)))),
    CONSTRAINT technical_assessments_control_media_altura_iz_check CHECK (((control_media_altura_iz IS NULL) OR ((control_media_altura_iz >= 0) AND (control_media_altura_iz <= 4)))),
    CONSTRAINT technical_assessments_control_rastrero_dr_check CHECK (((control_rastrero_dr IS NULL) OR ((control_rastrero_dr >= 0) AND (control_rastrero_dr <= 4)))),
    CONSTRAINT technical_assessments_control_rastrero_iz_check CHECK (((control_rastrero_iz IS NULL) OR ((control_rastrero_iz >= 0) AND (control_rastrero_iz <= 4)))),
    CONSTRAINT technical_assessments_definicion_carril_cen_dr_check CHECK (((definicion_carril_cen_dr IS NULL) OR ((definicion_carril_cen_dr >= 0) AND (definicion_carril_cen_dr <= 4)))),
    CONSTRAINT technical_assessments_definicion_carril_cen_iz_check CHECK (((definicion_carril_cen_iz IS NULL) OR ((definicion_carril_cen_iz >= 0) AND (definicion_carril_cen_iz <= 4)))),
    CONSTRAINT technical_assessments_definicion_carril_der_dr_check CHECK (((definicion_carril_der_dr IS NULL) OR ((definicion_carril_der_dr >= 0) AND (definicion_carril_der_dr <= 4)))),
    CONSTRAINT technical_assessments_definicion_carril_der_iz_check CHECK (((definicion_carril_der_iz IS NULL) OR ((definicion_carril_der_iz >= 0) AND (definicion_carril_der_iz <= 4)))),
    CONSTRAINT technical_assessments_definicion_carril_izq_dr_check CHECK (((definicion_carril_izq_dr IS NULL) OR ((definicion_carril_izq_dr >= 0) AND (definicion_carril_izq_dr <= 4)))),
    CONSTRAINT technical_assessments_definicion_carril_izq_iz_check CHECK (((definicion_carril_izq_iz IS NULL) OR ((definicion_carril_izq_iz >= 0) AND (definicion_carril_izq_iz <= 4)))),
    CONSTRAINT technical_assessments_definicion_intentos_check CHECK (((definicion_intentos >= 1) AND (definicion_intentos <= 4))),
    CONSTRAINT technical_assessments_pase_clasificacion_check CHECK ((pase_clasificacion = ANY (ARRAY['bueno'::text, 'aceptable'::text, 'inadecuado'::text]))),
    CONSTRAINT technical_assessments_pase_derecha_check CHECK (((pase_derecha >= 0) AND (pase_derecha <= 4))),
    CONSTRAINT technical_assessments_pase_intentos_check CHECK (((pase_intentos >= 1) AND (pase_intentos <= 4))),
    CONSTRAINT technical_assessments_pase_izquierda_check CHECK (((pase_izquierda >= 0) AND (pase_izquierda <= 4)))
);


--
-- Name: trainer_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trainer_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trainer_id uuid NOT NULL,
    block_type text NOT NULL,
    blocked_date date NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    reason text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT trainer_blocks_block_type_check CHECK ((block_type = ANY (ARRAY['full_day'::text, 'time_range'::text])))
);


--
-- Name: TABLE trainer_blocks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.trainer_blocks IS 'Bloqueos de agenda del entrenador (día completo o rango de horas)';


--
-- Name: COLUMN trainer_blocks.block_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trainer_blocks.block_type IS 'full_day = día completo bloqueado | time_range = solo un rango de horas';


--
-- Name: COLUMN trainer_blocks.reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trainer_blocks.reason IS 'Motivo OBLIGATORIO (enfermedad, viaje, etc.)';


--
-- Name: trainers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trainers (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    specialty text,
    bio text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    coverage_area text,
    available_days jsonb,
    available_hours_start time without time zone,
    available_hours_end time without time zone,
    timezone text DEFAULT 'America/Bogota'::text,
    photo_url text
);


--
-- Name: COLUMN trainers.coverage_area; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trainers.coverage_area IS 'Zona de cobertura del entrenador (ej: Norte, Sur, Centro)';


--
-- Name: COLUMN trainers.available_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trainers.available_days IS 'Array JSON de días disponibles. Ej: ["lunes", "miercoles", "viernes"]';


--
-- Name: COLUMN trainers.available_hours_start; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trainers.available_hours_start IS 'Hora de inicio de disponibilidad (ej: 08:00)';


--
-- Name: COLUMN trainers.available_hours_end; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trainers.available_hours_end IS 'Hora de fin de disponibilidad (ej: 18:00)';


--
-- Name: COLUMN trainers.timezone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trainers.timezone IS 'Zona horaria del entrenador';


--
-- Name: COLUMN trainers.photo_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trainers.photo_url IS 'URL de la foto de perfil en Supabase Storage (bucket: avatars)';


--
-- Name: training_videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_videos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    description text,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: trial_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trial_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    child_name text NOT NULL,
    guardian_name text NOT NULL,
    guardian_whatsapp text NOT NULL,
    guardian_email text,
    trial_date date NOT NULL,
    trial_time time without time zone NOT NULL,
    location text,
    payment_status text DEFAULT 'pendiente'::text NOT NULL,
    amount_paid numeric(10,2) DEFAULT 0,
    google_calendar_event_id text,
    converted_to_athlete_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    trainer_id uuid,
    status text DEFAULT 'programada'::text NOT NULL,
    CONSTRAINT trial_sessions_payment_status_check CHECK ((payment_status = ANY (ARRAY['pendiente'::text, 'pagado'::text]))),
    CONSTRAINT trial_sessions_status_check CHECK ((status = ANY (ARRAY['programada'::text, 'cancelada'::text])))
);


--
-- Name: TABLE trial_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.trial_sessions IS 'Clases de prueba - flujo separado de deportistas con plan';


--
-- Name: COLUMN trial_sessions.payment_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trial_sessions.payment_status IS 'Regla: Solo se da la clase si payment_status = pagado';


--
-- Name: COLUMN trial_sessions.converted_to_athlete_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trial_sessions.converted_to_athlete_id IS 'NULL si no ha convertido, UUID si ya se creó deportista desde este trial';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    role public.user_role DEFAULT 'trainer'::public.user_role NOT NULL,
    phone text,
    avatar_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    photo_url text
);


--
-- Name: COLUMN users.photo_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.photo_url IS 'URL de la foto de perfil en Supabase Storage (bucket: avatars)';


--
-- Name: athletes athletes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athletes
    ADD CONSTRAINT athletes_pkey PRIMARY KEY (id);


--
-- Name: guardians guardians_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardians
    ADD CONSTRAINT guardians_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: nutritional_assessments nutritional_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutritional_assessments
    ADD CONSTRAINT nutritional_assessments_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: physical_assessments physical_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physical_assessments
    ADD CONSTRAINT physical_assessments_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: session_reschedule_history session_reschedule_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_reschedule_history
    ADD CONSTRAINT session_reschedule_history_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_confirmation_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_confirmation_token_key UNIQUE (confirmation_token);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: technical_assessments technical_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.technical_assessments
    ADD CONSTRAINT technical_assessments_pkey PRIMARY KEY (id);


--
-- Name: trainer_blocks trainer_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainer_blocks
    ADD CONSTRAINT trainer_blocks_pkey PRIMARY KEY (id);


--
-- Name: trainers trainers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainers
    ADD CONSTRAINT trainers_pkey PRIMARY KEY (id);


--
-- Name: trainers trainers_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainers
    ADD CONSTRAINT trainers_user_id_key UNIQUE (user_id);


--
-- Name: training_videos training_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_videos
    ADD CONSTRAINT training_videos_pkey PRIMARY KEY (id);


--
-- Name: trial_sessions trial_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trial_sessions
    ADD CONSTRAINT trial_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, read) WHERE (read = false);


--
-- Name: idx_reschedule_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reschedule_history_created_at ON public.session_reschedule_history USING btree (created_at DESC);


--
-- Name: idx_reschedule_history_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reschedule_history_session_id ON public.session_reschedule_history USING btree (session_id);


--
-- Name: idx_trainer_blocks_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trainer_blocks_date ON public.trainer_blocks USING btree (blocked_date);


--
-- Name: idx_trainer_blocks_trainer_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trainer_blocks_trainer_date ON public.trainer_blocks USING btree (trainer_id, blocked_date);


--
-- Name: idx_trainer_blocks_trainer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trainer_blocks_trainer_id ON public.trainer_blocks USING btree (trainer_id);


--
-- Name: idx_trial_sessions_converted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trial_sessions_converted ON public.trial_sessions USING btree (converted_to_athlete_id);


--
-- Name: idx_trial_sessions_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trial_sessions_payment_status ON public.trial_sessions USING btree (payment_status);


--
-- Name: idx_trial_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trial_sessions_status ON public.trial_sessions USING btree (status);


--
-- Name: idx_trial_sessions_trainer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trial_sessions_trainer ON public.trial_sessions USING btree (trainer_id);


--
-- Name: idx_trial_sessions_trial_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trial_sessions_trial_date ON public.trial_sessions USING btree (trial_date);


--
-- Name: athletes trg_athletes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_athletes_updated_at BEFORE UPDATE ON public.athletes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: plans trg_plans_end_date; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_plans_end_date BEFORE INSERT ON public.plans FOR EACH ROW EXECUTE FUNCTION public.set_plan_end_date();


--
-- Name: plans trg_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: sessions trg_sessions_confirmation_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sessions_confirmation_status BEFORE INSERT OR UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_confirmation_status();


--
-- Name: sessions trg_sessions_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sessions_number BEFORE INSERT ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.set_session_number();


--
-- Name: sessions trg_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: notifications trigger_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_notifications_updated_at();


--
-- Name: trainer_blocks trigger_trainer_blocks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_trainer_blocks_updated_at BEFORE UPDATE ON public.trainer_blocks FOR EACH ROW EXECUTE FUNCTION public.update_trainer_blocks_updated_at();


--
-- Name: trial_sessions trigger_trial_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_trial_sessions_updated_at BEFORE UPDATE ON public.trial_sessions FOR EACH ROW EXECUTE FUNCTION public.update_trial_sessions_updated_at();


--
-- Name: nutritional_assessments update_nutritional_assessments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_nutritional_assessments_updated_at BEFORE UPDATE ON public.nutritional_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payments update_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: physical_assessments update_physical_assessments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_physical_assessments_updated_at BEFORE UPDATE ON public.physical_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: technical_assessments update_technical_assessments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_technical_assessments_updated_at BEFORE UPDATE ON public.technical_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: athletes athletes_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athletes
    ADD CONSTRAINT athletes_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) ON DELETE SET NULL;


--
-- Name: guardians guardians_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardians
    ADD CONSTRAINT guardians_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.athletes(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: nutritional_assessments nutritional_assessments_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutritional_assessments
    ADD CONSTRAINT nutritional_assessments_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.athletes(id);


--
-- Name: nutritional_assessments nutritional_assessments_evaluator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutritional_assessments
    ADD CONSTRAINT nutritional_assessments_evaluator_id_fkey FOREIGN KEY (evaluator_id) REFERENCES public.users(id);


--
-- Name: payments payments_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.athletes(id);


--
-- Name: payments payments_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: payments payments_registered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES public.users(id);


--
-- Name: physical_assessments physical_assessments_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physical_assessments
    ADD CONSTRAINT physical_assessments_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.athletes(id);


--
-- Name: physical_assessments physical_assessments_evaluator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physical_assessments
    ADD CONSTRAINT physical_assessments_evaluator_id_fkey FOREIGN KEY (evaluator_id) REFERENCES public.users(id);


--
-- Name: plans plans_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.athletes(id) ON DELETE CASCADE;


--
-- Name: session_reschedule_history session_reschedule_history_rescheduled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_reschedule_history
    ADD CONSTRAINT session_reschedule_history_rescheduled_by_fkey FOREIGN KEY (rescheduled_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: session_reschedule_history session_reschedule_history_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_reschedule_history
    ADD CONSTRAINT session_reschedule_history_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.athletes(id);


--
-- Name: sessions sessions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_rescheduled_from_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_rescheduled_from_fkey FOREIGN KEY (rescheduled_from) REFERENCES public.sessions(id);


--
-- Name: sessions sessions_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(id);


--
-- Name: technical_assessments technical_assessments_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.technical_assessments
    ADD CONSTRAINT technical_assessments_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.athletes(id);


--
-- Name: technical_assessments technical_assessments_evaluator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.technical_assessments
    ADD CONSTRAINT technical_assessments_evaluator_id_fkey FOREIGN KEY (evaluator_id) REFERENCES public.users(id);


--
-- Name: trainer_blocks trainer_blocks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainer_blocks
    ADD CONSTRAINT trainer_blocks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: trainer_blocks trainer_blocks_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainer_blocks
    ADD CONSTRAINT trainer_blocks_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) ON DELETE CASCADE;


--
-- Name: trainers trainers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainers
    ADD CONSTRAINT trainers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: training_videos training_videos_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_videos
    ADD CONSTRAINT training_videos_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: trial_sessions trial_sessions_converted_to_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trial_sessions
    ADD CONSTRAINT trial_sessions_converted_to_athlete_id_fkey FOREIGN KEY (converted_to_athlete_id) REFERENCES public.athletes(id) ON DELETE SET NULL;


--
-- Name: trial_sessions trial_sessions_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trial_sessions
    ADD CONSTRAINT trial_sessions_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) ON DELETE SET NULL;


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: athletes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

--
-- Name: guardians; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: nutritional_assessments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nutritional_assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: physical_assessments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.physical_assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

--
-- Name: session_reschedule_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session_reschedule_history ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: technical_assessments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.technical_assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: trainer_blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trainer_blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: trainers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;

--
-- Name: training_videos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;

--
-- Name: trial_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trial_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


