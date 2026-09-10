# FORZA — Estado Real del Proyecto
> Fuente única de verdad. Actualizado: 9 Sep 2026
> Verificado con `git log` + Linear API

---

## 📍 ESTADO DE RAMAS (verificado con git)

### main (producción)
- **Commit actual:** `63507a9` - Merge PR #9 (develop)
- **Incluye:** FOR-59 ✅
- **NO incluye:** FOR-60, FOR-71, FOR-73, FOR-74, contexto Sep 2026, FOR-85, FOR-86
- **Pendiente:** PR `develop → main` para subir todo lo validado (ver "Próximo paso")
- **Deploy:** https://forza-momentum.vercel.app · Backend: https://forza-api-u7cq.onrender.com/api

### develop (staging) — **12 commits adelante de main**
- **Commit actual:** `26df992` - Merge PR #22 (bugfix/FOR-85)
- **Incluye y VALIDADO en staging:**
  - ✅ FOR-59 (asignar entrenador al crear deportista)
  - ✅ FOR-60 (vincular plan al crear deportista)
  - ✅ FOR-71 (scroll automático en banner de error)
  - ✅ FOR-73 (plan_id nullable en sessions) — nota: el ticket FOR-73 en Linear
        describe otro bug (validación al editar), resuelto por FOR-85
  - ✅ FOR-74 (pre-llenar entrenador en crear sesión)
  - ✅ FOR-85 (persistir gender + entrenador opcional + plan solo-lectura al editar)
  - ✅ FOR-86 (calcular y mostrar end_date del plan)
  - ✅ Migración backend Railway → Render
  - ✅ Migraciones SQL 001, 002, 003
  - ✅ Linear integration scripts
- **Deploy staging:** https://forza-git-develop-jcrc.vercel.app

### demo (demostración cliente) — muy atrás de develop
- **Commit actual:** `5b8978e` - fix URL backend Railway → Render
- No bloquea nada; se actualiza solo cuando haya que mostrar al cliente

---

## 🗄️ MIGRACIONES SQL

> ⚠️ Confirmar si la Supabase de producción es la MISMA instancia que staging.
> Si es compartida (como el backend en Render), las 3 migraciones ya están
> aplicadas. Si prod tiene BD separada, correr 001 + 002 + 003 antes del deploy a main.

### ✅ `001_business_context_sep_2026.sql` (1 Sep 2026)
- 4 tablas nuevas: `trial_sessions`, `trainer_blocks`, `session_reschedule_history`, `notifications`
- 15 columnas nuevas en `athletes`, `trainers`, `users`, `plans`, `sessions`

### ✅ `002_backfill_plan_end_date.sql` (9 Sep 2026)
- Backfill de `plans.end_date` para planes previos a FOR-86
- Regla uniforme: `end_date = start_date + 1 mes + 1 semana`

### 🔄 `003_backfill_athlete_gender.sql` (9 Sep 2026) — PARCIAL
- Diagnóstico + plantilla manual para asignar `gender` a deportistas creados con el bug de FOR-85
- El género NO se puede inferir: hay que rellenar los `UPDATE` a mano (o reeditar en la app)
- **Acción pendiente:** completar los `UPDATE` para todos los deportistas con `gender IS NULL`

---

## 📋 LINEAR — CYCLE 14 (hasta 11 Sep 2026)

**Verificado con `node scripts/linear-sync.js list`**

| Ticket | Descripción | Estado | Prioridad |
|--------|-------------|--------|-----------|
| FOR-85 | Bug: gender no se persiste al crear deportista | ✅ Done | Alta |
| FOR-86 | end_date del plan: no se calcula ni se muestra | ✅ Done | Alta |
| FOR-73 | Validación incorrecta al editar deportista | ✅ Done (resuelto por FOR-85) | Media |
| FOR-61 | Registrar pago inicial al crear deportista | Todo | Alta |
| FOR-62 | Limitar sesiones según clases del plan | Todo | Alta |
| FOR-63 | Entrenador ve pagos del deportista | Todo | Media |
| FOR-76 | Validación de pago antes de confirmar/agendar sesión | Todo | Alta |

**Sincronizar Linear siempre:** `update FOR-XX "In Progress"` al arrancar, `"In Review"` al
terminar la rama, `"Done"` cuando el PR entre a develop. (No usar `start`: fuerza prefijo
`feature/` y hace `git pull`.)

---

## ⏭️ PRÓXIMO PASO (9 Sep 2026)

### 1. Promover develop → main (release)

Todo lo que hay en `develop` está validado en staging. No hace falta repetir los
checklists de FOR-59/60/85/86; sí conviene un **smoke test corto** en staging de los
flujos transversales antes del PR:

- [ ] Login admin y trainer
- [ ] Deportistas: lista, detalle, crear (con y sin entrenador, con y sin plan), editar
- [ ] Sesiones: crear + confirmar entrenador
- [ ] Planes: lista (columna "Fin" visible), freeze/cancel
- [ ] Pagos: lista + abono
- [ ] Dashboard con datos reales

Luego:
- [ ] Completar `migrations/003` (gender) para deportistas existentes
- [ ] Confirmar estado de la BD de producción (ver sección Migraciones)
- [ ] PR `develop → main` → dispara deploy Vercel (front) + Render (back)
- [ ] Verificar producción tras el deploy

### 2. Comenzar FOR-61 — Pago inicial al crear deportista (Alta)

- Depende de FOR-60 ✅ (ya en develop)
- **Backend:** al crear deportista, si viene `pago_inicial` (monto), crear registro en
  `payments` asociado al plan vinculado. Monto libre (parcial o total).
- **Frontend:** sección de pago inicial en el form de crear deportista
  (checkbox "¿hizo pago inicial?" + monto). Solo al crear.
- Si no hay pago → deportista queda con estado "debe" visible en perfil y en el widget
  de pagos vencidos.

---

## 🔧 AMBIENTE DE DESARROLLO

```bash
git checkout develop && git pull

# ⚠️ Antes de nx serve api
export $(cat apps/api/.env | xargs)

npx nx serve api   # terminal 1 → localhost:3000
npx nx serve web   # terminal 2 → localhost:4200

# Credenciales
admin@forza.com / Forza2024!
trainer@forza.com / [ver .env]
```

---

## 🚀 DEPLOYMENTS

| Entorno | Rama | Frontend | Backend |
|---------|------|----------|---------|
| Producción | main | https://forza-momentum.vercel.app | Render |
| Staging | develop | https://forza-git-develop-jcrc.vercel.app | Render |
| Demo | demo | Vercel preview | Render |

**Nota:** Backend compartido entre todos los entornos (Railway → Render migrado).

---

## 📊 BACKLOG CYCLE 15+

### Cycle 15 (11 Sep - 25 Sep 2026)
- FOR-66 — Intentos configurables 1-4 en evaluaciones
- FOR-67 — Fórmulas nutricionales por género M/F
- FOR-68 — Filtros y exportar pagos a Excel
- FOR-69 — Vista entrenadores con clases y deportistas

### Cycle 16 (25 Sep - 9 Oct 2026)
- FOR-77 — Disponibilidad entrenador (días + horarios)
- FOR-78 — Bloqueos de agenda del entrenador
- FOR-79 — Reprogramación con límite máx 2 veces
- FOR-80 — Extensión manual de planes

### Cycle 17 (9 Oct - 23 Oct 2026)
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
