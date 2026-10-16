# FORZA — Estado Real del Proyecto
> Fuente única de verdad. Actualizado: 16 Oct 2026
> Verificado con `git log` + Linear API

---

## 📍 ESTADO DE RAMAS (verificado con git)

### main (producción) — commit `cf649a2` — **un paso atrás de develop**
- PR #33 (develop → main): incluye FOR-66, FOR-67, FOR-68.
- **Cycle 15 completo en producción.**
- FOR-69 está mergeado a `develop` pero **todavía no a `main`** — pendiente de
  acumular más tickets de Cycle 17 antes del próximo release.
- **Deploy:** https://forza-momentum.vercel.app · Backend: https://forza-api-u7cq.onrender.com/api

### develop — commit `a5c2a8b` — un commit adelante de main (FOR-69)
- FOR-69 (banner de campos faltantes + CRUD de acudientes) mergeado 16 Oct 2026.
- Backend de producción (Render) **no tiene este código todavía** — solo se prueba
  en local hasta el próximo release a `main`.

### demo — muy atrás, no bloquea

### Ramas de feature abiertas sin mergear
- `feature/FOR-57-rediseno-agenda` (julio 2026, 2 commits) — **se deja a propósito**,
  no borrar. FOR-64 ("Retomar rediseño Agenda") es justo continuar este trabajo, no
  empezar de cero. Revisar ese código cuando se tome FOR-64.
- `feature/FOR-65-intentos-configurables-evaluaciones` — **en progreso ahora**.

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

## 📋 LINEAR — CYCLE 15 (11-25 Sep 2026) — ✅ COMPLETO EN PRODUCCIÓN

| Ticket | Descripción | Estado |
|--------|-------------|--------|
| FOR-66 | Fórmulas nutricionales diferenciadas por género (M/F) | ✅ Done |
| FOR-67 | Filtros por mes/plan y exportar pagos a Excel | ✅ Done |
| FOR-68 | Vista entrenadores con clases y deportistas | ✅ Done |

## 📋 LINEAR — CYCLE 17 (9-23 Oct 2026) — activo

| Ticket | Descripción | Estado |
|--------|-------------|--------|
| FOR-69 | Banner de campos faltantes en detalle deportista | ✅ Done (en develop, falta release a main) |
| FOR-65 | Intentos configurables en evaluación técnica y física | 🔵 In Progress — actual |
| FOR-71 | Módulo deportistas en clase de prueba | Todo |
| FOR-77 | Disponibilidad de entrenadores (días/horarios) | Todo |
| FOR-78 | Bloqueos de agenda del entrenador | Todo |
| FOR-79 | Historial de reprogramaciones (máx 2 por sesión) | Todo |
| FOR-80 | Extensión manual de planes | Todo |
| FOR-81 | Banner alertas de plan por vencer | Todo |
| FOR-64 | Retomar rediseño Agenda (FOR-57) | Todo — ver rama vieja arriba |

**FOR-69 — detalle:** `GET /athletes/:id/status` calcula `missing_fields` (posición,
acudiente) y `evaluations_overdue` (30 días desde última evaluación nutricional/
técnica/física, o nunca evaluado = vencido). CRUD completo de acudientes (antes no
existía ninguna UI, pese a que la tabla ya tenía datos). Campo `position` nuevo en
athletes (migración `004_add_athlete_position.sql`).

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

Trabajando en **FOR-65** (rama `feature/FOR-65-intentos-configurables-evaluaciones`,
creada desde `develop` el 16 Oct 2026, Linear ya en "In Progress").

**FOR-65 — resumen del ticket:** hoy los campos de evaluación técnica y física tienen
un número fijo de intentos. Hay que agregar un desplegable (1 a 4 intentos) al inicio
de esos formularios; según lo elegido se muestran N campos de entrada. Los cálculos
(% efectividad, clasificación) se hacen sobre el número de intentos elegido. Aplica a:
Control de Balón, Precisión en el Pase, Definición, Salto Vertical, Salto Horizontal.
Cambios: frontend (selector + render dinámico) y backend (DTOs reciben array de
intentos, cálculo sobre promedio/total según el test).

Después de FOR-65: siguiente en la lista es FOR-71 (confirmar en Linear antes de
arrancar, por si vuelve a rodar el cycle).

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

## 📊 BACKLOG SIN CYCLE ASIGNADO

- FOR-87 — Validación inline (borde rojo) en formularios
- FOR-54 — Recordatorios automáticos WhatsApp
- FOR-55 — Historial congelamientos
- FOR-46 — UI/UX Premium con Stitch (rediseño visual general)
- FOR-58 — Landing page pública

Nota: los cycles ruedan solos por fecha en Linear (ya pasó de Cycle 15 → 16 → 17).
Siempre confirmar con `node scripts/linear-sync.js list` antes de dar por buena
cualquier lista de tickets/estados en este archivo.
