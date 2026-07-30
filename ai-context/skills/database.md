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
public.users        → role, full_name, is_active
    ↓ FK
public.trainers     → specialty, bio
    ↓ FK
public.athletes     → first_name, last_name, birth_date, gender, status, trainer_id
    ↓ FK
public.guardians    → full_name, whatsapp_phone, is_primary
public.plans        → plan_type, total_sessions, start_date, is_active, is_frozen
    ↓ FK
public.sessions     → session_date, session_time, location, status, confirmation_status
public.payments     → amount, amount_paid, status, method, due_date
public.appointments → scheduled_date, scheduled_time, location, status (reuniones de equipo)

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
