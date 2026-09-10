# Database Skill — FORZA Supabase

> Basado en el código real del proyecto. Leer antes de hacer queries o agregar tablas.

---

## Acceso desde el backend

```typescript
// El SupabaseService usa SERVICE_ROLE_KEY → bypasea RLS
this.supabase.db   // SupabaseClient listo para usar
```

Toda la interacción con la DB va por `SupabaseService`. Nunca instanciar el cliente directamente.

---

## Tablas y relaciones

```
auth.users          ← Supabase managed (autenticación)
    ↓ FK
public.users        → role, full_name, is_active, photo_url
    ↓ FK
public.trainers     → specialty, bio, coverage_area, available_days, available_hours_start/end, timezone, photo_url
    ↓ FK
public.athletes     → first_name, last_name, birth_date, gender, status, trainer_id, came_from_trial, trial_date, photo_url
    ↓ FK
public.guardians    → full_name, whatsapp_phone, is_primary
public.plans        → plan_type, total_sessions, start_date, is_active, is_frozen, extended_times, extension_notes, original_end_date
    ↓ FK
public.sessions     → session_date, session_time, location, status, confirmation_status, reschedule_count, cancellation_reason
public.payments     → amount, amount_paid, status, method, due_date
public.appointments → scheduled_date, scheduled_time, location, status (reuniones de equipo)

public.trial_sessions          → child_name, guardian_name, guardian_whatsapp, trial_date, payment_status, converted_to_athlete_id
public.trainer_blocks          → trainer_id, block_type, blocked_date, start_time, end_time, reason, created_by
public.session_reschedule_history → session_id, original_date, new_date, reason, rescheduled_by
public.notifications           → user_id, type, title, message, link, read (FASE 2 — Cycle 15+)

public.nutritional_assessments → FK athletes + users(evaluator_id)
public.technical_assessments   → FK athletes + users(evaluator_id)
public.physical_assessments    → FK athletes + users(evaluator_id)
public.training_videos         → FK users(uploaded_by)
```

### Relación crítica
`sessions.trainer_id` → `trainers.id` (NO `users.id`)  
Para obtener el nombre del entrenador en una sesión hay que hacer join: `trainers → users`.

---

## Convenciones de la DB

```sql
-- Todas las tablas tienen:
id          uuid DEFAULT gen_random_uuid() PRIMARY KEY
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()  -- actualizado por trigger

-- FKs siempre nombradas como:
athlete_id  → athletes.id
trainer_id  → trainers.id   (NO users.id)
plan_id     → plans.id
user_id     → users.id
evaluator_id → users.id
```

### ENUMs activos
```sql
user_role:       super_admin | admin | trainer | nutritionist
athlete_status:  active | inactive | trial
plan_type:       momentum | momentum_pro | master | master_pro |
                 frz | frz_pro | elite | elite_pro | addicted_to_football
```

Otros campos con CHECK constraint en lugar de ENUM:
```sql
gender:               CHECK (gender IN ('M', 'F'))
payments.status:      CHECK IN ('pendiente', 'parcial', 'pagado')
payments.method:      CHECK IN ('transferencia', 'efectivo', 'otro')
sessions.status:      pending | completed | cancelled
sessions.confirmation_status: pending | partial | verified | conflict
```

---

## Patrones de query con SupabaseService

### SELECT con relaciones (FK joins)

```typescript
// Sintaxis de Supabase para joins: tabla_relacionada(campo1, campo2)
const { data, error } = await this.supabase.db
  .from('sessions')
  .select(`
    *,
    athletes(id, first_name, last_name),
    plans(id, plan_type, total_sessions),
    trainers(id, users(full_name))
  `)
  .order('session_date', { ascending: false });

// FK con nombre custom (alias) — cuando el campo FK no coincide con el nombre de tabla
.select('*, evaluator:users!evaluator_id(id, full_name)')
```

### SELECT con filtros

```typescript
// Filtro simple
.eq('athlete_id', athleteId)

// Filtro condicional (encadenar antes de await)
let query = this.supabase.db.from('sessions').select('*');
if (trainerId) query = query.eq('trainer_id', trainerId);
if (athleteId) query = query.eq('athlete_id', athleteId);
const { data, error } = await query;

// In (múltiples valores)
.in('status', ['pending', 'partial'])

// Mayor/menor que
.gte('session_date', fechaInicio)
.lte('session_date', fechaFin)
```

### INSERT

```typescript
const { data, error } = await this.supabase.db
  .from('sessions')
  .insert({
    athlete_id:   dto.athlete_id,
    trainer_id:   dto.trainer_id,
    session_date: dto.session_date,
    // Null explícito para campos opcionales vacíos
    session_name: dto.session_name ?? null,
  })
  .select()           // SIEMPRE para obtener el registro creado con id y timestamps
  .single();
```

### UPDATE

```typescript
// SIEMPRE llamar findOne() antes para validar que existe
await this.findOne(id);

const { data, error } = await this.supabase.db
  .from('sessions')
  .update({ status: 'completed', ...dto })
  .eq('id', id)
  .select()
  .single();
```

### DELETE

```typescript
const { error } = await this.supabase.db
  .from('sessions')
  .delete()
  .eq('id', id);

if (error) throw new BadRequestException(error.message);
return { message: 'Eliminado correctamente' };
```

### single() vs sin single()

```typescript
// .single() → espera exactamente 1 resultado. Error si hay 0 o más de 1.
.eq('id', id).single();

// Sin .single() → devuelve array. Usar para listas.
.order('created_at', { ascending: false });
// → data es T[] (puede ser [] si no hay resultados)
```

---

## Manejo de errores de Supabase

```typescript
const { data, error } = await this.supabase.db.from('athletes').select('*').eq('id', id).single();

// Error de DB (constraint, timeout, etc.)
if (error) throw new BadRequestException(error.message);

// No encontrado (single() devolvió null)
if (!data) throw new NotFoundException(`Deportista ${id} no encontrado`);

// Patrón combinado (más común en findOne)
if (error || !data) throw new NotFoundException(`Deportista ${id} no encontrado`);
```

---

## Campos calculados — NUNCA en la DB

Los siguientes campos se calculan en el service y nunca se almacenan:

| Campo | Calculado en |
|-------|-------------|
| `age` (edad del deportista) | `AthletesService.calculateAge()` |
| `sumatoria_pliegues_mm`, `porcentaje_grasa`, `imc`, `iaks`, `imlg`, `peso_ideal_kg`, `complexion_osea`, `peso_graso_kg`, `masa_libre_grasa_kg` | `AssessmentsService.calcularNutricional()` |
| `control_efectividad_*_pct`, `pase_efectividad_pct`, `definicion_efectividad_*_pct` | `AssessmentsService.calcularTecnico()` |
| `salto_vertical_clasificacion`, `salto_horizontal_clasificacion` | `AssessmentsService.clasificarSalto()` con tablas FUPRECOL |

---

## Triggers activos en Supabase

```sql
-- updated_at → se actualiza automáticamente en cada UPDATE (todas las tablas)
-- session_number → se auto-incrementa al insertar una sesión para el mismo plan
-- end_date en plans → start_date + 1 mes + 1 semana
-- confirmation_status en sessions → se recalcula cuando cambian confirmed_by_trainer o confirmed_by_guardian
```

---

## Nuevas tablas — checklist obligatorio

Al crear una tabla nueva en Supabase:
1. `id uuid DEFAULT gen_random_uuid() PRIMARY KEY`
2. `created_at`, `updated_at` con trigger
3. Habilitar **RLS** (Row Level Security)
4. Agregar **política permisiva** para service role:
   ```sql
   CREATE POLICY "Allow service role" ON public.nueva_tabla
   FOR ALL USING (true);
   ```
   Sin esto, las queries desde el backend fallan aunque uses SERVICE_ROLE_KEY con RLS activo.

---

## Queries de referencia frecuentes

```sql
-- Deportista con su entrenador
SELECT a.*, u.full_name as trainer_name
FROM athletes a
LEFT JOIN trainers t ON a.trainer_id = t.id
LEFT JOIN users u ON t.user_id = u.id
WHERE a.id = 'uuid';

-- Sesiones del mes actual
SELECT * FROM sessions
WHERE date_trunc('month', session_date) = date_trunc('month', CURRENT_DATE)
ORDER BY session_date DESC;

-- Pagos pendientes
SELECT p.*, a.first_name, a.last_name
FROM payments p
JOIN athletes a ON p.athlete_id = a.id
WHERE p.status IN ('pendiente', 'parcial');

-- Trainer ID a partir de user ID (patrón muy usado)
SELECT id FROM trainers WHERE user_id = 'user-uuid';
```

---

## Tablas nuevas — Definición completa

### trial_sessions

**Propósito:** Almacena las clases de prueba (trial) — flujo separado de deportistas con plan.

```sql
CREATE TABLE public.trial_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_name text NOT NULL,
  guardian_name text NOT NULL,
  guardian_whatsapp text NOT NULL,
  guardian_email text NOT NULL,
  trial_date date NOT NULL,
  trial_time time NOT NULL,
  location text,
  payment_status text CHECK (payment_status IN ('pendiente', 'pagado')),
  amount_paid numeric(10,2) DEFAULT 30000,
  google_calendar_event_id text, -- ID del evento en Google Calendar
  converted_to_athlete_id uuid REFERENCES athletes(id), -- NULL si no ha convertido
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indices
CREATE INDEX idx_trial_sessions_trial_date ON trial_sessions(trial_date);
CREATE INDEX idx_trial_sessions_payment_status ON trial_sessions(payment_status);
CREATE INDEX idx_trial_sessions_converted ON trial_sessions(converted_to_athlete_id);
```

**Regla de negocio:** Solo se da la clase si `payment_status = 'pagado'`.

---

### trainer_blocks

**Propósito:** Bloqueos de agenda del entrenador (día completo o rango de horas).

```sql
CREATE TABLE public.trainer_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  block_type text NOT NULL CHECK (block_type IN ('full_day', 'time_range')),
  blocked_date date NOT NULL,
  start_time time, -- nullable si block_type = 'full_day'
  end_time time,   -- nullable si block_type = 'full_day'
  reason text NOT NULL, -- motivo OBLIGATORIO
  created_by uuid NOT NULL REFERENCES users(id), -- quién lo creó (admin o el trainer)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indices
CREATE INDEX idx_trainer_blocks_trainer_id ON trainer_blocks(trainer_id);
CREATE INDEX idx_trainer_blocks_date ON trainer_blocks(blocked_date);
```

**Validación:** `reason` es obligatorio (NOT NULL).

---

### session_reschedule_history

**Propósito:** Historial de reprogramaciones de sesiones (máximo 2 por sesión).

```sql
CREATE TABLE public.session_reschedule_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  original_date date NOT NULL,
  original_time time NOT NULL,
  new_date date NOT NULL,
  new_time time NOT NULL,
  reason text NOT NULL, -- motivo de la reprogramación
  rescheduled_by uuid NOT NULL REFERENCES users(id), -- quién hizo la reprogramación
  created_at timestamptz DEFAULT now()
);

-- Indices
CREATE INDEX idx_reschedule_history_session_id ON session_reschedule_history(session_id);
```

**Regla de negocio:** Antes de insertar, validar que `sessions.reschedule_count < 2`.

---

### notifications (FASE 2 — Cycle 15+)

**Propósito:** Sistema de notificaciones centralizado (campanita).

```sql
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'evaluation_due', 'plan_expiring', 'trainer_blocked', 'payment_overdue'
  title text NOT NULL,
  message text NOT NULL,
  link text, -- URL interna para navegar (ej: /deportistas/123)
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indices
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

**Uso:** Campanita en topbar → lista de notificaciones sin leer → click en notificación → navega a `link`.

---

## Columnas nuevas en tablas existentes

### athletes

```sql
ALTER TABLE athletes ADD COLUMN came_from_trial boolean DEFAULT false;
ALTER TABLE athletes ADD COLUMN trial_date date;
ALTER TABLE athletes ADD COLUMN photo_url text;
```

- `came_from_trial`: indica si el deportista proviene de una clase de prueba convertida
- `trial_date`: fecha de la clase de prueba (para métricas de conversión)
- `photo_url`: URL de la foto de perfil (Supabase Storage bucket 'avatars')

---

### trainers

```sql
ALTER TABLE trainers ADD COLUMN coverage_area text;
ALTER TABLE trainers ADD COLUMN available_days jsonb;
ALTER TABLE trainers ADD COLUMN available_hours_start time;
ALTER TABLE trainers ADD COLUMN available_hours_end time;
ALTER TABLE trainers ADD COLUMN timezone text DEFAULT 'America/Bogota';
ALTER TABLE trainers ADD COLUMN photo_url text;
```

- `coverage_area`: zona de cobertura del entrenador (ej: "Sur", "Centro", "Envigado")
- `available_days`: array JSON de días disponibles (ej: `["lunes", "miercoles", "viernes"]`)
- `available_hours_start` / `end`: rango de horas en que el entrenador está disponible
- `timezone`: zona horaria del entrenador
- `photo_url`: URL de la foto de perfil

**Validación de agendamiento:** Solo permitir crear sesiones en días/horas dentro de `available_days` y el rango `available_hours_start` - `available_hours_end`.

---

### users

```sql
ALTER TABLE users ADD COLUMN photo_url text;
```

- `photo_url`: URL de la foto de perfil del usuario (admin, nutritionist)

---

### plans

```sql
ALTER TABLE plans ADD COLUMN extended_times int DEFAULT 0;
ALTER TABLE plans ADD COLUMN extension_notes text;
ALTER TABLE plans ADD COLUMN original_end_date date;
```

- `extended_times`: contador de cuántas veces se ha extendido el plan
- `extension_notes`: registro de extensiones (JSON o texto libre — quién, cuándo, por qué)
- `original_end_date`: fecha de fin original del plan (antes de extensiones)

**Regla de negocio:** El admin puede extender manualmente la duración del plan si quedan clases pendientes. Cada extensión incrementa `extended_times` y agrega una nota a `extension_notes`.

---

### sessions

```sql
ALTER TABLE sessions ADD COLUMN reschedule_count int DEFAULT 0;
ALTER TABLE sessions ADD COLUMN cancellation_reason text;
```

- `reschedule_count`: contador de cuántas veces se ha reprogramado esta sesión (máx 2)
- `cancellation_reason`: motivo de cancelación (obligatorio si `status = 'cancelled'`)

**Validación:** Antes de reprogramar, verificar que `reschedule_count < 2`.
