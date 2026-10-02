# FORZA — Estado Real del Proyecto
> Fuente única de verdad. Actualizado: 15 Sep 2026
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

### develop (staging) — commit `9933cd5` — un poco adelante de main (FOR-66 + FOR-67, Cycle 15)
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

### 🔜 Cycle 15 (11-25 Sep 2026) — en curso

⚠️ Los números de ticket que teníamos anotados acá NO coincidían con Linear
(se corrieron). Confirmado con `node scripts/linear-sync.js list` el 14 Sep:

| Ticket | Descripción | Estado |
|--------|-------------|--------|
| FOR-66 | Fórmulas nutricionales diferenciadas por género (M/F) | ✅ Done — bug menor encontrado y arreglado (ver abajo) |
| FOR-67 | Filtros por mes/plan y exportar pagos a Excel | ✅ Done — ver nota de seguridad xlsx abajo |
| FOR-68 | Vista entrenadores con clases y deportistas | 🔄 En curso — siguiente |
| FOR-69 | Banner de campos faltantes en detalle deportista | Todo |

**FOR-66 — hallazgo:** las fórmulas de Yuhasz (% grasa por sexo) ya estaban
implementadas desde Cycle 14 (efecto colateral de FOR-85, gender), tanto en
backend (`assessments.service.ts`) como en el preview del frontend
(`nutritional-form.ts`). Validado con los fixtures A1 (M) y A2 (F) —
mismos pliegues (Σ=100mm), % grasa distinto solo por género, IMC igual en
ambos (correcto, no depende de género). Se encontró una inconsistencia de
redondeo: el preview usaba `toFixed(2)` y el backend `Math.round(x*100)/100`;
por imprecisión de punto flotante daban resultados distintos en casos borde
(13.095 → preview 13.09, backend 13.10). Corregido unificando el redondeo
del frontend al método del backend. Queda un registro de prueba guardado en
el fixture A1 (`PRUEBA AlDia`) — no hay endpoint DELETE para evaluaciones
nutricionales, se limpia solo con el próximo `--wipe`.

**FOR-67 — nota de seguridad (xlsx):** la exportación usa `xlsx@0.18.5` de
npm para generar el `.xlsx` (SheetJS). Esa versión tiene 2 CVEs conocidos
(prototype pollution + ReDoS), pero ambos se disparan al **parsear** un
archivo `.xlsx` no confiable — nuestro código solo **genera** el archivo
desde datos internos (`json_to_sheet` + `writeFile`), nunca lo parsea, así
que el riesgo real hoy es bajo. ⚠️ Si en algún momento se agrega una función
de **importar** pagos/datos desde un Excel subido por el usuario, ahí sí hay
que resolver esto primero: instalar la versión parchada desde el CDN oficial
(`npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` — no
instalable en este sandbox por restricción de URLs externas, pero sí desde
una máquina normal) o cambiar de librería.

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
- FOR-54 — Recordatorios automáticos WhatsApp
- FOR-55 — Historial congelamientos
- FOR-46 — UI/UX Premium con Stitch
- FOR-58 — Landing page pública
