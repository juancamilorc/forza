# FORZA — Estado Real del Proyecto
> Fuente única de verdad. Actualizado: 2 Sep 2026
> Verificado con `git log` + Linear API

---

## 📍 ESTADO DE RAMAS (verificado con git)

### main (producción)
- **Commit actual:** `63507a9` - Merge pull request #9 from juancamilorc/develop
- **Incluye:** FOR-59 (asignar entrenador al crear deportista) ✅
- **NO incluye:** FOR-60 ni commits posteriores
- **Deploy:** https://forza-momentum.vercel.app
- **Backend:** https://forza-api-u7cq.onrender.com/api

### develop (staging) — **11 commits adelante de main**
- **Commit actual:** `2ca8cd8` - feat: contexto de negocio Sep 2026 + 9 tickets nuevos + migraciones SQL
- **Incluye:**
  - ✅ FOR-59 (asignar entrenador al crear deportista)
  - ✅ FOR-60 (vincular plan al crear deportista)
  - ✅ FOR-71 (scroll automático en banner de error)
  - ✅ FOR-73 (plan_id nullable en sessions)
  - ✅ FOR-74 (pre-llenar entrenador en crear sesión)
  - ✅ Migración backend Railway → Render
  - ✅ Migraciones SQL (4 tablas nuevas)
  - ✅ Linear integration scripts
- **Deploy staging:** https://forza-git-develop-jcrc.vercel.app
- **Backend:** https://forza-api-u7cq.onrender.com/api (mismo que prod)

### demo (demostración cliente) — **24 commits atrás de develop**
- **Commit actual:** `5b8978e` - fix: actualizar URL backend de Railway a Render en rama demo
- **Incluye:** versión anterior sin FOR-59 ni FOR-60
- **Deploy:** Vercel (URL de preview de rama demo)
- **Backend:** https://forza-api-u7cq.onrender.com/api (mismo que prod)

---

## 🗄️ MIGRACIONES SQL

### ✅ Ejecutada: `001_business_context_sep_2026.sql` (1 Sep 2026)

**4 tablas nuevas creadas:**
1. `trial_sessions` — Clases de prueba ($30k) — FOR-71
2. `trainer_blocks` — Bloqueos de agenda del entrenador — FOR-78
3. `session_reschedule_history` — Historial de reprogramaciones (máx 2) — FOR-79
4. `notifications` — Sistema de notificaciones centralizado — Fase 2

**15 columnas nuevas agregadas:**
- `athletes`: came_from_trial, trial_date, photo_url
- `trainers`: coverage_area, available_days, available_hours_start, available_hours_end, timezone, photo_url
- `users`: photo_url
- `plans`: extended_times, extension_notes, original_end_date
- `sessions`: reschedule_count, cancellation_reason

---

## 📋 LINEAR — CYCLE 14 ACTIVO (hasta 11 Sep 2026)

**Estado verificado con Linear API** (`node scripts/linear-sync.js list`)

| Ticket | Descripción | Estado | Prioridad |
|--------|-------------|--------|-----------|
| FOR-61 | Registrar pago inicial al crear deportista | Todo | Alta |
| FOR-62 | Limitar sesiones según clases del plan | Todo | Alta |
| FOR-63 | Entrenador ve pagos del deportista | Todo | Media |
| FOR-73 | Validación incorrecta al editar deportista | In Progress | Alta |
| FOR-76 | Validación de pago antes de confirmar sesión | Todo | Alta |

---

## ⏭️ PRÓXIMO PASO (3 Sep 2026)

### EJECUTAR CHECKLIST DE VALIDACIÓN EN STAGING

**URL de pruebas:** https://forza-git-develop-jcrc.vercel.app  
**Credenciales:** admin@forza.com / Forza2024!

**IMPORTANTE:** FOR-59 y FOR-60 están en develop pero NO han sido probados en staging.

---

## 🎯 FOR-59 — Asignar entrenador al crear deportista

### Caso 1: Crear deportista CON entrenador

- [ ] Login como admin
- [ ] Ir a `/deportistas/nuevo`
- [ ] **Verificar:** Aparece dropdown "Entrenador asignado"
- [ ] **Verificar:** El dropdown carga la lista de entrenadores (mínimo 1)
- [ ] Llenar datos obligatorios:
  - Nombre completo
  - Género
  - Fecha de nacimiento
  - Estado (activo/inactivo/prueba)
- [ ] Seleccionar un entrenador del dropdown
- [ ] Click en "Guardar"
- [ ] **Verificar:** Redirect a `/deportistas/:id`
- [ ] **Verificar:** En el detalle aparece el nombre del entrenador asignado
- [ ] **Verificar:** Toast de éxito aparece

### Caso 2: Crear deportista SIN entrenador

- [ ] Ir a `/deportistas/nuevo`
- [ ] Llenar datos obligatorios
- [ ] **NO** seleccionar entrenador (dejar vacío)
- [ ] Click en "Guardar"
- [ ] **Verificar:** Deportista se crea exitosamente
- [ ] **Verificar:** En detalle NO aparece entrenador o dice "Sin asignar"

### Caso 3: Editar deportista y cambiar entrenador

- [ ] Ir a `/deportistas`
- [ ] Click en un deportista que ya tiene entrenador
- [ ] Click en "Editar"
- [ ] **Verificar:** El dropdown muestra el entrenador actual pre-seleccionado
- [ ] Cambiar a otro entrenador
- [ ] Click en "Guardar"
- [ ] **Verificar:** En detalle aparece el nuevo entrenador
- [ ] **Verificar:** El cambio se guardó en la base de datos

### Caso 4: Editar deportista y quitar entrenador

- [ ] Editar un deportista que tiene entrenador
- [ ] Cambiar dropdown a "Sin asignar" o vacío (si existe esa opción)
- [ ] Guardar
- [ ] **Verificar:** El deportista queda sin entrenador

---

## 🎯 FOR-60 — Vincular plan al crear deportista

### Caso 1: Crear deportista CON plan inicial

- [ ] Login como admin
- [ ] Ir a `/deportistas/nuevo`
- [ ] **Verificar:** Aparece sección "Plan Inicial (opcional)"
- [ ] **Verificar:** Aparece dropdown de tipo de plan (Momentum, Master, Elite, etc.)
- [ ] **Verificar:** Aparece campo "Fecha de inicio"
- [ ] Llenar datos del deportista
- [ ] Seleccionar tipo de plan: **Momentum**
- [ ] Ingresar fecha de inicio: **Hoy (3 Sep 2026)**
- [ ] Click en "Guardar"
- [ ] **Verificar:** Redirect a detalle del deportista
- [ ] **Verificar:** En detalle aparece sección "Plan Activo"
- [ ] **Verificar:** Muestra tipo de plan: Momentum
- [ ] **Verificar:** Muestra fecha inicio: 3 Sep 2026
- [ ] **Verificar:** Muestra fecha fin calculada: **1 Oct 2026** (4 semanas para Momentum)
- [ ] Ir a `/planes`
- [ ] **Verificar:** El plan creado aparece en la lista vinculado al deportista
- [ ] **Verificar:** Estado del plan: "activo"

### Caso 2: Crear deportista SIN plan inicial

- [ ] Ir a `/deportistas/nuevo`
- [ ] Llenar datos del deportista
- [ ] **NO** llenar la sección de plan (dejar vacío)
- [ ] Click en "Guardar"
- [ ] **Verificar:** Deportista se crea exitosamente
- [ ] **Verificar:** En detalle dice "Sin plan activo" o similar
- [ ] **Verificar:** NO se creó ningún plan en `/planes`

### Caso 3: Validar cálculo de end_date por tipo de plan

- [ ] Crear deportista con plan **Master** (duración: 8 semanas)
- [ ] Fecha inicio: 3 Sep 2026
- [ ] **Verificar end_date:** 29 Oct 2026 (2 meses después)
- [ ] Crear deportista con plan **Elite** (duración: 12 semanas)
- [ ] Fecha inicio: 3 Sep 2026
- [ ] **Verificar end_date:** 26 Nov 2026 (3 meses después)

### Caso 4: Editar deportista que YA tiene plan

- [ ] Ir a deportista con plan activo
- [ ] Click en "Editar"
- [ ] **Verificar:** La sección de plan NO aparece o está deshabilitada
- [ ] **Verificar:** No se puede modificar el plan desde edición de deportista
- [ ] **Nota:** Los planes se editan desde `/planes/:id`

---

## 🔍 Validaciones extras

### Backend (verificar en Network tab)

- [ ] Al crear deportista CON entrenador: payload incluye `trainer_id`
- [ ] Al crear deportista CON plan: payload incluye `plan` object con `plan_type` y `start_date`
- [ ] Response 201 Created en ambos casos
- [ ] No hay errores 500 en consola

### Base de datos (opcional - verificar en Supabase)

- [ ] Tabla `athletes`: columna `trainer_id` tiene UUID del entrenador
- [ ] Tabla `plans`: nueva fila con `athlete_id` correcto
- [ ] `end_date` en `plans` se calculó correctamente según tipo de plan

---

## 🐛 Casos de error a validar

### FOR-59 errores

- [ ] Si el entrenador no existe: ¿muestra error amigable?
- [ ] Si el dropdown de entrenadores está vacío: ¿se puede crear el deportista sin entrenador?

### FOR-60 errores

- [ ] Si selecciono plan pero no fecha inicio: ¿muestra error de validación?
- [ ] Si selecciono fecha inicio pero no tipo de plan: ¿muestra error de validación?

---

## ✅ Después de completar las pruebas

**Reportar:**
1. ✅ Qué funcionó bien
2. ❌ Qué falló
3. 🐛 Bugs encontrados con detalles

**Luego → Comenzar FOR-61**

**FOR-61 — Registrar pago inicial al crear deportista**
- Depende de FOR-60 (código ya está en develop ✅)
- Backend: validar que plan existe + crear registro en `payments`
- Frontend: agregar campos de pago al formulario de deportista

---

## 🔧 AMBIENTE DE DESARROLLO

```bash
# Rama base de trabajo
git checkout develop

# Desarrollo local
npx nx serve api   # terminal 1 → localhost:3000
npx nx serve web   # terminal 2 → localhost:4200

# Credenciales de prueba
admin@forza.com / Forza2024!
trainer@forza.com / [ver .env]

# ⚠️ Antes de nx serve api
export $(cat apps/api/.env | xargs)
```

---

## 🚀 DEPLOYMENTS

| Entorno | Rama | Frontend | Backend |
|---------|------|----------|---------|
| Producción | main | https://forza-momentum.vercel.app | Render |
| Staging | develop | https://forza-git-develop-jcrc.vercel.app | Render |
| Demo | demo | Vercel preview | Render |

**Nota:** Backend es compartido entre todos los entornos (Railway → Render migrado).

---

## 📊 BACKLOG CYCLE 15+ (después de Cycle 14)

### Cycle 15 (12 Sep - 25 Sep 2026)
- FOR-66 — Intentos configurables 1-4 en evaluaciones
- FOR-67 — Fórmulas nutricionales por género M/F
- FOR-68 — Filtros y exportar pagos a Excel
- FOR-69 — Vista entrenadores con clases y deportistas

### Cycle 16 (26 Sep - 9 Oct 2026)
- FOR-77 — Disponibilidad entrenador (días + horarios)
- FOR-78 — Bloqueos de agenda del entrenador
- FOR-79 — Reprogramación con límite máx 2 veces
- FOR-80 — Extensión manual de planes

### Cycle 17 (10 Oct - 23 Oct 2026)
- FOR-81 — Notificaciones: evaluaciones vencidas
- FOR-82 — Notificaciones: plan próximo a vencer
- FOR-83 — Subir foto de perfil (deportistas + entrenadores)
- FOR-84 — Sesiones tipo "extra" y "reposición"

### Sin cycle asignado
- FOR-64 — Rediseño completo Agenda/Schedule
- FOR-70 — Banner campos faltantes en detalle deportista
- FOR-54 — Recordatorios automáticos WhatsApp
- FOR-55 — Historial congelamientos
- FOR-46 — UI/UX Premium con Stitch
- FOR-58 — Landing page pública
