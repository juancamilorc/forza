# FORZA — Estado Real del Proyecto
> Fuente única de verdad. Actualizado: 28 Oct 2026 (post-release a main)
> Verificado con `git log` + Linear API

---

## 📍 ESTADO DE RAMAS (verificado con git)

### main (producción) — commit `65f04d1` — nivelado con develop
- PR #38 (develop → main), 28 Oct 2026: **FOR-69, FOR-65 y FOR-71 en producción.**
- Smoke post-deploy contra producción: 10/10 OK (perfil, status/acudientes, evaluaciones
  con intentos, `/prueba` con 403 para entrenador, crear/WhatsApp/convertir clase).
- **Deploy:** https://forza-momentum.vercel.app · Backend: https://forza-api-u7cq.onrender.com/api

### develop — nivelado con main (solo difiere en commits de docs)

### demo — muy atrás, no bloquea

### Ramas de feature abiertas sin mergear
- `feature/FOR-57-rediseno-agenda` (julio 2026, 2 commits) — **se deja a propósito**,
  no borrar. FOR-64 ("Retomar rediseño Agenda") es justo continuar este trabajo, no
  empezar de cero. Revisar ese código cuando se tome FOR-64.

---

## ⚠️ GOTCHAS DE INFRAESTRUCTURA (aprendidos el 2, 14 y 28 Oct)

1. **Supabase (plan free) pausa el proyecto tras varios días de inactividad.** Si el
   login falla con `{"message":"fetch failed","error":"Unauthorized"}` en vez de un
   401 normal, lo primero es revisar el dashboard de Supabase y reactivar el proyecto
   — no es un bug de código. Pasó tras 16 días (2 Oct), 12 días (14 Oct) y 6 días
   (28 Oct) sin tocar el repo. Desde la máquina local la señal es DNS: el host del
   proyecto da `ENOTFOUND` mientras github.com/supabase.com sí resuelven.
2. **Hay un solo backend Render, compartido por TODOS los entornos, y despliega desde
   `main`** (no desde `develop`). Esto significa que el deploy de staging en Vercel
   (`develop`) habla con el MISMO backend que producción — no hay forma de probar un
   endpoint nuevo "en staging" hasta que el código llegue a `main`. Las pruebas reales
   de un ticket se hacen en local; el deploy a `main` es el único lugar para verificar
   contra infraestructura real.
3. Render también se "duerme" tras inactividad (free tier) — el primer request tras un
   rato sin tráfico puede tardar 30-60s (cold start). No confundir con un error real.
4. **IDs de entrenadores NO son UUID estrictos:** 7 de 9 `trainers.id` son tipo
   `bbbb0001-0000-0000-0000-00000000000N`. `@IsUUID()` los rechaza → validar
   `trainer_id` con `@IsString()` (como el resto del repo). Pasó en FOR-71.
5. **`wa.me` + emojis:** la app de WhatsApp Desktop en Mac rompe los emojis al abrir
   enlaces `wa.me` (salen `�`) aunque el URL esté bien codificado. Por eso el módulo
   de clases de prueba tiene botón "WhatsApp" y botón "Copiar mensaje".
6. **`<select>` con `@for`:** usar `[selected]` en cada `<option>`, no `[value]` en el
   `<select>` (no refleja el valor inicial). Patrón del resto del repo.
7. **Tests con Playwright contra Supabase:** la latencia hace que un `waitForTimeout`
   corto dé falsos negativos tras PATCH+GET. Esperar por condición (`locator.waitFor`).

---

## 📋 LINEAR — CYCLE 15 (11-25 Sep 2026) — ✅ COMPLETO EN PRODUCCIÓN

| Ticket | Descripción | Estado |
|--------|-------------|--------|
| FOR-66 | Fórmulas nutricionales diferenciadas por género (M/F) | ✅ Done |
| FOR-67 | Filtros por mes/plan y exportar pagos a Excel | ✅ Done |
| FOR-68 | Vista entrenadores con clases y deportistas | ✅ Done |

## 📋 LINEAR — PLAN DE CYCLES (reorganizado el 28 Oct 2026)

Capacidad real del usuario: **3-4 tickets por cycle** (su trabajo principal limita el
tiempo). Si hay más holgura, se adelanta del siguiente cycle.

| Cycle | Fechas | Tickets |
|-------|--------|---------|
| **18** (activo) | 23 Oct → 6 Nov | **FOR-77** disponibilidad de entrenadores · **FOR-88** bug "Ver evolución" |
| 19 | 6 → 20 Nov | FOR-78 bloqueos de agenda · FOR-79 historial de reprogramaciones · FOR-84 conversión trial (resto) |
| 20 | 20 Nov → 4 Dic | FOR-64 rediseño Agenda · FOR-80 extensión de planes · FOR-81 banner plan por vencer |
| 21 | 4 → 18 Dic | FOR-82 reasignar sesiones al bloquear agenda · FOR-87 validación inline |
| Sin cycle | | FOR-46 (rediseño UI), FOR-54 y FOR-70 (WhatsApp Business API, Fase 2), FOR-55, FOR-58, FOR-83 |

Orden: FOR-77 primero porque FOR-78/82/64 dependen de la disponibilidad.
Done: FOR-65, FOR-66, FOR-67, FOR-68, FOR-69, FOR-71.

**FOR-84 — decisión confirmada (28 Oct):** para convertir una clase de prueba la clase
**debe estar pagada**. Se implementa en FOR-84 (validación en `POST /trial-sessions/:id/convert`
+ botón deshabilitado en `/prueba`). Hasta entonces la conversión NO exige el pago.
FOR-71 ya cubrió la base de la conversión; a FOR-84 le queda: validar pago, `came_from_trial`
+ badge en el perfil, link bidireccional, plan y pago inicial en el formulario, banner.

**FOR-69 — detalle:** `GET /athletes/:id/status` calcula `missing_fields` (posición,
acudiente) y `evaluations_overdue` (30 días desde última evaluación nutricional/
técnica/física, o nunca evaluado = vencido). CRUD completo de acudientes (antes no
existía ninguna UI, pese a que la tabla ya tenía datos). Campo `position` nuevo en
athletes (migración `004_add_athlete_position.sql`).

**FOR-65 — detalle:** Control de Balón, Pase y Definición (técnica) ahora tienen
selector de intentos (1-4) independiente por test — antes fijo en 2 o 4. Salto
Vertical/Horizontal (física) ahora registran de 1 a 4 intentos en cm; se clasifica
con el mejor (máximo), que se guarda en el mismo campo de siempre (`salto_vertical_cm`)
para no romper nada que ya lo consumía. Migración `005_intentos_configurables_evaluaciones.sql`.
Bug encontrado y corregido durante el desarrollo: `<select>` con `[value]` en el host
no refleja bien el valor inicial cuando las `<option>` se generan con `@for` — hay que
usar `[selected]` en cada `<option>` (patrón ya usado en el resto del repo, ej.
athlete-form.html). Guardar esto como gotcha para futuros selects dinámicos.

**FOR-71 — detalle:** módulo `/prueba` (solo admin) sobre la tabla `trial_sessions`
que ya existía; migración `006` le agrega `trainer_id`, `status` (programada/cancelada),
`amount_paid` default 0 y `guardian_email` opcional. Precio fijo $35.000 en
`TRIAL_PRICE` (backend). Acciones: crear, reprogramar/editar, cancelar, marcar pagada,
WhatsApp (link `wa.me` con mensaje estructurado, **sin envío automático**: Business API
es Fase 2) y copiar mensaje, y **convertir en deportista** (crea athlete en estado
`trial` + acudiente principal; endpoint `POST /trial-sessions/:id/convert`).
**Regla de estado:** `PaymentsService.activateAthleteIfPaid` pasa `trial → active`
cuando un pago queda `pagado` (create/update/abonar); nunca baja de active a trial.
Decisión pendiente de confirmar con el cliente: activar solo con pago **completo** (hoy)
o con el primer abono. Pendiente de probar con flujo real de cliente.

**FOR-88 — pendiente de investigar:** el botón "Ver evolución" en `/evaluaciones`
(filtrado por deportista) no parece hacer nada visible al hacer clic. El código
(`assessments-list.ts:136`, `hasEvoData()`) requiere ≥2 evaluaciones del mismo tipo
para ese deportista para mostrar el botón/datos — puede ser que simplemente falte un
estado vacío explicando por qué no aparece nada, o puede ser un bug real en
`enterEvoMode()`. No investigado a fondo todavía.

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

Arrancar **FOR-77 — Disponibilidad de entrenadores (días/horarios)**. Leer el ticket
completo en Linear antes (query GraphQL) y explorar el código de agenda/sesiones
existente. Luego FOR-88 (bug corto) para cerrar Cycle 18.

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
