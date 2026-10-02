# FORZA — Estado Real del Proyecto
> Fuente única de verdad. Actualizado: 2 Oct 2026
> Verificado con `git log` + Linear API

---

## 📍 ESTADO DE RAMAS (verificado con git)

### main (producción) — commit `cf649a2` — nivelado con develop
- PR #33 (develop → main): incluye FOR-66, FOR-67, FOR-68.
- **Cycle 15 completo en producción** (FOR-69 quedó sin hacer y rodó a Cycle 16).
- Sin migraciones nuevas en este release — todo lógica de backend/frontend.
- Smoke post-deploy confirmado manualmente: login OK, `/admin/trainers/overview` OK.
- **Deploy:** https://forza-momentum.vercel.app · Backend: https://forza-api-u7cq.onrender.com/api

### develop — commit `cf649a2` — nivelado con main

### demo — muy atrás, no bloquea

### Ramas de feature abiertas sin mergear
- `feature/FOR-57-rediseno-agenda` (julio 2026, 2 commits) — **se deja a propósito**,
  no borrar. FOR-64 ("Retomar rediseño Agenda") es justo continuar este trabajo, no
  empezar de cero. Revisar ese código cuando se tome FOR-64.

---

## ⚠️ GOTCHAS DE INFRAESTRUCTURA (nuevos, aprendidos el 2 Oct)

1. **Supabase (plan free) pausa el proyecto tras varios días de inactividad.** Si el
   login falla con `{"message":"fetch failed","error":"Unauthorized"}` en vez de un
   401 normal, lo primero es revisar el dashboard de Supabase y reactivar el proyecto
   — no es un bug de código. Pasó tras 16 días sin tocar el repo.
2. **Hay un solo backend Render, compartido por TODOS los entornos, y despliega desde
   `main`** (no desde `develop`). Esto significa que el deploy de staging en Vercel
   (`develop`) habla con el MISMO backend que producción — no hay forma de probar un
   endpoint nuevo "en staging" hasta que el código llegue a `main`. Las pruebas reales
   de un ticket se hacen en local; el deploy a `main` es el único lugar para verificar
   contra infraestructura real.
3. Render también se "duerme" tras inactividad (free tier) — el primer request tras un
   rato sin tráfico puede tardar 30-60s (cold start). No confundir con un error real.

---

## 📋 LINEAR — CYCLE 15 (11-25 Sep 2026) — ✅ COMPLETO (FOR-69 rodó a Cycle 16)

| Ticket | Descripción | Estado |
|--------|-------------|--------|
| FOR-66 | Fórmulas nutricionales diferenciadas por género (M/F) | ✅ Done |
| FOR-67 | Filtros por mes/plan y exportar pagos a Excel | ✅ Done |
| FOR-68 | Vista entrenadores con clases y deportistas | ✅ Done |

**FOR-66 — hallazgo:** las fórmulas de Yuhasz (% grasa por sexo) ya estaban
implementadas desde Cycle 14 (efecto colateral de FOR-85, gender). Se corrigió una
inconsistencia de redondeo entre el preview (`toFixed`) y el backend (`Math.round`).

**FOR-67 — nota de seguridad (xlsx):** exportación usa `xlsx@0.18.5` de npm (2 CVEs
conocidos, ambos de **parsear** `.xlsx` no confiables). Nuestro código solo **genera**
el archivo desde datos internos, nunca parsea — riesgo real bajo hoy. ⚠️ Si se agrega
una función de **importar** Excel más adelante, resolver esto primero (versión
parchada del CDN oficial de SheetJS, o cambiar de librería).

**FOR-68 — detalle:** `GET /api/admin/trainers/overview` — admin ve el resumen de
todos los entrenadores, el trainer logueado ve solo el suyo (y su nav dice "Mi
resumen", no "Entrenadores"). Por deportista: clases dadas/restantes, vencimiento del
plan (badge "vence pronto" a ≤7 días) y saldo pendiente (badge "Debe $monto"). Fila
clickeable → detalle del deportista.

**Sincronizar Linear siempre:** `update FOR-XX "In Progress"` al arrancar, `"In Review"`
al terminar la rama, `"Done"` cuando el PR entre a develop. (No usar `start`: fuerza
prefijo `feature/` y hace `git pull`.)

---

## ⏭️ PRÓXIMO PASO

### 🔜 Cycle 16 (25 Sep - 9 Oct 2026) — activo

| Ticket | Descripción | Estado |
|--------|-------------|--------|
| FOR-69 | Banner de campos faltantes en detalle deportista | Todo — siguiente |
| FOR-65 | Intentos configurables en evaluación técnica y física | Todo |
| FOR-64 | Retomar rediseño Agenda (FOR-57) | Todo — ver rama vieja arriba |
| FOR-71 | Módulo deportistas en clase de prueba | Todo |
| FOR-77 | Disponibilidad de entrenadores (días/horarios) | Todo |

Verificar detalle de cada uno en Linear antes de arrancar (`node scripts/linear-sync.js list`).

---

## 🔧 AMBIENTE DE DESARROLLO

```bash
git checkout develop && git pull

# ⚠️ El .env real vive en la RAÍZ del repo, no en apps/api/
export $(cat .env | xargs)

npx nx serve api   # terminal 1 → localhost:3000
npx nx serve web   # terminal 2 → localhost:4200

# Credenciales
admin@forza.com / Forza2024!
trainer@forza.com / [tiene el password el usuario; el user_id no tiene deportistas
                     asignados por defecto — reasignar uno temporalmente para probar]
```

⚠️ **`nx serve` puede quedarse "esperando" otro proceso** (`Running in another Nx
process...` / `Waiting for api:serve:development in another nx process`) si quedó un
proceso anterior pegado al lock del daemon. Si pasa: `lsof -i :3000` / `:4200` para
ver qué hay, matar los procesos sueltos (`kill -9 <pid>`), `npx nx daemon --stop`, y
volver a correr `nx serve`.

### Datos de prueba
- BD compartida (main/develop/local), **sin datos reales** — todo es de prueba.
- `node scripts/seed-test-data.js --wipe` → reset a 5 fixtures documentados en
  `TEST-DATA.md`. Conserva users/trainers.
- ⚠️ **Ojo al cambiar de rama para probar un ticket**: el servidor local (`nx serve`)
  corre el código de la rama que esté activa en el working directory en ese momento.
  Si cambias de rama a mitad de una prueba, el backend puede dejar de tener la
  validación que estás probando. Confirmar en qué rama se está antes de repetir una
  prueba que "no bloqueó cuando debía".

---

## 🚀 DEPLOYMENTS

| Entorno | Rama | Frontend | Backend |
|---------|------|----------|---------|
| Producción | main | https://forza-momentum.vercel.app | Render (único, compartido) |
| Staging | develop | https://forza-git-develop-jcrc.vercel.app | mismo Render que producción |
| Demo | demo | Vercel preview | mismo Render |

**Nota:** Un solo backend + BD compartidos entre todos los entornos, desplegado desde
`main`. Ver gotchas de infraestructura arriba.

---

## 📊 BACKLOG CYCLE 17+

### Cycle 17 (9 Oct - 23 Oct 2026)
- FOR-78 — Bloqueos de agenda del entrenador
- FOR-79 — Reprogramación con límite máx 2 veces
- FOR-80 — Extensión manual de planes
- FOR-81 — Notificaciones: evaluaciones vencidas
- FOR-82 — Notificaciones: plan próximo a vencer
- FOR-83 — Subir foto de perfil (deportistas + entrenadores)
- FOR-84 — Sesiones tipo "extra" y "reposición" (parcialmente cubierto por FOR-62/FOR-63)

### Sin cycle asignado
- FOR-87 — Validación inline (borde rojo) en formularios
- FOR-54 — Recordatorios automáticos WhatsApp
- FOR-55 — Historial congelamientos
- FOR-46 — UI/UX Premium con Stitch (rediseño visual general)
- FOR-58 — Landing page pública

Nota: estos números de Cycle 17 son los que había antes del salto de 16 días —
confirmar en Linear antes de dar por buena esta lista, igual que pasó con Cycle 15/16.
