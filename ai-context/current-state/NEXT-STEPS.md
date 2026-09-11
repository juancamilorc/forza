# FORZA — Estado Real del Proyecto
> Fuente única de verdad. Actualizado: 11 Sep 2026
> Verificado con `git log` + Linear API

---

## 📍 ESTADO DE RAMAS (verificado con git)

### main (producción) — commit `5d4c03d` — nivelado con develop
- PR #29 (develop → main): incluye FOR-61, FOR-62, FOR-63, FOR-76 + todo lo anterior
  (FOR-59, FOR-60, FOR-71, FOR-73, FOR-74, contexto Sep 2026, FOR-85, FOR-86).
- **Cycle 14 completo en producción.**
- Sin migraciones nuevas en este release — todo lógica de backend/frontend.
- Smoke post-deploy: login OK, `/sessions` 200.
- **Deploy:** https://forza-momentum.vercel.app · Backend: https://forza-api-u7cq.onrender.com/api

### develop (staging) — commit `5d4c03d` — nivelado con main
- **Deploy staging:** https://forza-git-develop-jcrc.vercel.app
- ✅ Branch protection activa en `main` y `develop` (Restrict deletions + Block force
  pushes, bypass list vacía) — confirmado con capturas, ya no debería repetirse el
  incidente de borrado de ramas.

### demo — muy atrás, no bloquea

---

## 🗄️ MIGRACIONES SQL

Todas aplicadas, sin pendientes. `001` (contexto negocio), `002` (backfill end_date),
`003` (backfill gender) — las 3 en la BD compartida (main/develop/local).

---

## 📋 LINEAR — CYCLE 14 (28 Ago → 11 Sep 2026) — ✅ COMPLETO

| Ticket | Descripción | Estado |
|--------|-------------|--------|
| FOR-59 | Asignar entrenador al crear deportista | ✅ Done |
| FOR-85 | Bug: gender no se persiste al crear deportista | ✅ Done |
| FOR-86 | end_date del plan: no se calcula ni se muestra | ✅ Done |
| FOR-73 | Validación incorrecta al editar deportista | ✅ Done (resuelto por FOR-85) |
| FOR-61 | Registrar pago inicial al crear deportista | ✅ Done |
| FOR-62 | Limitar sesiones según clases del plan | ✅ Done |
| FOR-76 | Validación de pago antes de confirmar/agendar sesión | ✅ Done |
| FOR-63 | Entrenador ve pagos del deportista | ✅ Done |

Los 8 tickets del cycle, en producción. FOR-87 (validación inline, borde rojo en
formularios) sigue en backlog sin cycle asignado.

**Sincronizar Linear siempre:** `update FOR-XX "In Progress"` al arrancar, `"In Review"`
al terminar la rama, `"Done"` cuando el PR entre a develop. (No usar `start`: fuerza
prefijo `feature/` y hace `git pull`.)

---

## ⏭️ PRÓXIMO PASO

### 🔜 Cycle 15 (11-25 Sep 2026) — empieza mañana

| Ticket | Descripción | Prioridad |
|--------|-------------|-----------|
| FOR-66 | Intentos configurables 1-4 en evaluaciones | — |
| FOR-67 | Fórmulas nutricionales por género M/F | — |
| FOR-68 | Filtros y exportar pagos a Excel | — |
| FOR-69 | Vista entrenadores con clases y deportistas | — |

Verificar prioridad/detalle de cada uno en Linear antes de arrancar (`node
scripts/linear-sync.js list` una vez el cycle quede activo, o revisar directo en Linear).

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
trainer@forza.com / [tiene el password el usuario; el user_id no tiene deportistas
                     asignados por defecto — reasignar uno temporalmente para probar]
```

### Datos de prueba
- BD compartida (main/develop/local), **sin datos reales** — todo es de prueba.
- `node scripts/seed-test-data.js --wipe` → reset a 5 fixtures documentados en
  `TEST-DATA.md`. Conserva users/trainers.
- ⚠️ **Ojo al cambiar de rama para probar un ticket**: el servidor local (`nx serve`)
  corre el código de la rama que esté activa en el working directory en ese momento.
  Si cambias de rama a mitad de una prueba, el backend puede dejar de tener la
  validación que estás probando — pasó dos veces esta semana. Confirmar en qué rama
  se está antes de repetir una prueba que "no bloqueó cuando debía".

---

## 🚀 DEPLOYMENTS

| Entorno | Rama | Frontend | Backend |
|---------|------|----------|---------|
| Producción | main | https://forza-momentum.vercel.app | Render |
| Staging | develop | https://forza-git-develop-jcrc.vercel.app | Render |
| Demo | demo | Vercel preview | Render |

**Nota:** Backend y BD compartidos entre todos los entornos.

---

## 📊 BACKLOG CYCLE 16+

### Cycle 16 (25 Sep - 9 Oct 2026)
- FOR-77 — Disponibilidad entrenador (días + horarios)
- FOR-78 — Bloqueos de agenda del entrenador
- FOR-79 — Reprogramación con límite máx 2 veces
- FOR-80 — Extensión manual de planes

### Cycle 17 (9 Oct - 23 Oct 2026)
- FOR-81 — Notificaciones: evaluaciones vencidas
- FOR-82 — Notificaciones: plan próximo a vencer
- FOR-83 — Subir foto de perfil (deportistas + entrenadores)
- FOR-84 — Sesiones tipo "extra" y "reposición" (parcialmente cubierto por FOR-62/FOR-63)

### Sin cycle asignado
- FOR-87 — Validación inline (borde rojo) en formularios
- FOR-64 — Rediseño completo Agenda/Schedule
- FOR-70 — Banner campos faltantes en detalle deportista
- FOR-54 — Recordatorios automáticos WhatsApp
- FOR-55 — Historial congelamientos
- FOR-46 — UI/UX Premium con Stitch
- FOR-58 — Landing page pública
