# FORZA — Estado Real del Proyecto
> Fuente única de verdad. Actualizado: 11 Sep 2026
> Verificado con `git log` + Linear API

---

## 📍 ESTADO DE RAMAS (verificado con git)

### main (producción) — commit `489fb0f`
- Incluye FOR-59, FOR-60, FOR-71, FOR-73, FOR-74, contexto Sep 2026, FOR-85, FOR-86
- **Deploy:** https://forza-momentum.vercel.app · Backend: https://forza-api-u7cq.onrender.com/api

### develop (staging) — commit `5e7b6d6` — **1 PR adelante de main (FOR-61 + FOR-62, PR #24 y #25)**
- Incluye además FOR-61 (pago inicial) y FOR-62 (límite de sesiones + cancelar sesión +
  sesión extra + badges). **Pendiente release a main** cuando se acumule lo suficiente
  o el usuario lo pida.
- ⚠️ `origin/develop` se borró una vez al mergear un PR (auto-delete head branch) y se
  restauró por push. **Pendiente: branch protection en `main` y `develop`** para
  bloquear borrado/force-push — no se ha configurado todavía.
- **Deploy staging:** https://forza-git-develop-jcrc.vercel.app

### demo — `5b8978e`, muy atrás. No bloquea; se actualiza al mostrar al cliente.

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

### ✅ `003_backfill_athlete_gender.sql` (9 Sep 2026) — COMPLETADO
- Asignación manual de `gender` a deportistas creados con el bug de FOR-85
- Verificado: 0 de 27 deportistas con `gender IS NULL`

---

## 📋 LINEAR — CYCLE 14 (28 Ago → 11 Sep 2026, terminó/termina hoy)

**Verificado con `node scripts/linear-sync.js list`**

| Ticket | Descripción | Estado | Prioridad |
|--------|-------------|--------|-----------|
| FOR-59 | Asignar entrenador al crear deportista | ✅ Done | Alta |
| FOR-85 | Bug: gender no se persiste al crear deportista | ✅ Done | Alta |
| FOR-86 | end_date del plan: no se calcula ni se muestra | ✅ Done | Alta |
| FOR-73 | Validación incorrecta al editar deportista | ✅ Done (resuelto por FOR-85) | Media |
| FOR-61 | Registrar pago inicial al crear deportista | ✅ Done (PR #24) | Alta |
| FOR-62 | Limitar sesiones según clases del plan | ✅ Done (PR #25) | Alta |
| FOR-63 | Entrenador ve pagos del deportista | ⏳ Todo — **no alcanzó el cycle** | Media |
| FOR-76 | Validación de pago antes de confirmar/agendar sesión | ⏳ Todo — **no alcanzó el cycle** | Alta |
| FOR-87 | Validación inline (borde rojo) en formularios | Backlog, sin cycle | Media |

**Cycle 15 ya empezó (11-25 Sep):** FOR-66, FOR-67, FOR-68, FOR-69. FOR-63 y FOR-76 quedaron
sin terminar de Cycle 14 — decidir si se mueven a Cycle 15 o se hacen antes.

**Sincronizar Linear siempre:** `update FOR-XX "In Progress"` al arrancar, `"In Review"` al
terminar la rama, `"Done"` cuando el PR entre a develop. (No usar `start`: fuerza prefijo
`feature/` y hace `git pull`.)

---

## ⏭️ PRÓXIMO PASO (11 Sep 2026)

### ✅ Release a main — HECHO (PR #23, 9 Sep)
Smoke test API + validación manual en staging pasados. Deploy Vercel + Render disparado.
- [ ] Verificación final en la UI de producción (crear deportista con plan → ver "Fin")
- [ ] Agregar branch protection en `main` y `develop` — **sigue pendiente**

### ✅ FOR-61 — Pago inicial al crear deportista — HECHO (PR #24)
Sección de pago inicial en el form de crear deportista, vencimiento calculado
(inicio − 1 día), badge "Al día / Debe $X" en el detalle. + seed de datos de prueba
(`scripts/seed-test-data.js`, ver `TEST-DATA.md`).

### ✅ FOR-62 — Limitar sesiones según clases del plan — HECHO (PR #25)
Límite de cupo derivado (sin migración), cancelar sesión desde `/sesiones`, checkbox
"Sesión extra" en crear sesión, badge "Extra" en `/sesiones` y `/agenda`.

### 🔜 Decidir: terminar Cycle 14 (FOR-63, FOR-76) o pasar a Cycle 15
- **FOR-76** (Alta) — validación dura de pago antes de confirmar/agendar sesión. Se
  apoya en lo que ya existe (payments + sessions), buen candidato a seguir.
- **FOR-63** (Media) — trainer ve pagos de sus deportistas (solo lectura).
- Si se decide mover a Cycle 15: `node scripts/linear-sync.js move-to-cycle "Cycle 15" "FOR-63,FOR-76"`

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
- FOR-87 — Validación inline: resaltar en rojo los campos faltantes en formularios (feedback FOR-61)
- FOR-54 — Recordatorios automáticos WhatsApp
- FOR-55 — Historial congelamientos
- FOR-46 — UI/UX Premium con Stitch
- FOR-58 — Landing page pública
