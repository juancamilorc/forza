# FORZA — Next Steps
> This file tells Claude Code exactly what to do next.
> Update after every session.

---

## 🚀 PRODUCCIÓN — estado actual (Agosto 2026)

| Servicio | URL | Estado |
|----------|-----|--------|
| Frontend | https://forza-momentum.vercel.app | ✅ Live |
| Backend  | https://forza-api-u7cq.onrender.com/api | ✅ Live (Render) |
| DB       | Supabase nhegevwfgunvberilthm | ✅ Live |

**Última migración:** Backend migrado de Railway a Render (2026-08-11)

---

## ⏳ PENDIENTE VALIDACIÓN EN PRODUCCIÓN

### FOR-59 — Asignar entrenador al crear deportista ✅
- Mergeado a `main` ✅
- Desplegado en producción ✅
- **Pendiente:** Ejecutar checklist de pruebas en https://forza-momentum.vercel.app

### FOR-60 — Vincular plan al crear deportista ✅
- Mergeado a `main` ✅
- Desplegado en producción ✅
- **Pendiente:** Ejecutar checklist de pruebas en https://forza-momentum.vercel.app

**Siguiente paso:** Validar FOR-59 + FOR-60 en producción antes de arrancar FOR-61

---

## 📋 PENDIENTE — Cycle 12 (siguiente)

### FOR-61 — Pago inicial al crear deportista ⭐ High
- Depende de FOR-60 (completado, pendiente validación)
### FOR-63 — Limitar sesiones según clases del plan ⭐ High
- Depende de FOR-60
### FOR-64 — Entrenador ve pagos del deportista solo lectura ⭐ High
### FOR-65 — Retomar FOR-57 rediseño Agenda ⭐ High

---

## 📋 PENDIENTE — Cycle 13

### FOR-66 — Intentos configurables 1-4 en evaluaciones técnica y física
### FOR-67 — Fórmulas nutricionales por género M/F
### FOR-68 — Filtros y exportar pagos a Excel
### FOR-69 — Vista entrenadores con clases y deportistas
### FOR-70 — Banner campos faltantes en detalle deportista

---

## 📋 PENDIENTE — Cycle 14 (Fase 2)

### FOR-71 — Auto-confirmar sesión + encuesta WhatsApp 48h
### FOR-72 — Módulo deportistas clase de prueba ($35k)
### FOR-54 — Recordatorios automáticos WhatsApp (ya en Linear)
### FOR-55 — Historial congelamientos (ya en Linear)
### FOR-46 — UI/UX Premium con Stitch (ya en Linear)
### FOR-58 — Landing page pública (ya en Linear)

---

## 🔧 ENVIRONMENT

```bash
# Rama base de trabajo: develop
git checkout develop && git pull

# Desarrollo local
npx nx serve api   # terminal 1 → localhost:3000
npx nx serve web   # terminal 2 → localhost:4200

# Credenciales de prueba
admin@forza.com / Forza2024!
trainer@forza.com / [ver .env]

# Staging
Frontend: https://forza-git-develop-jcrc.vercel.app
Backend:  https://forza-api-u7cq.onrender.com/api (mismo que prod)

# Producción
Frontend: https://forza-momentum.vercel.app
Backend:  https://forza-api-u7cq.onrender.com/api
Supabase: nhegevwfgunvberilthm

# ⚠️ Dev local: exportar variables antes de nx serve api
# export $(cat apps/api/.env | xargs)
```
