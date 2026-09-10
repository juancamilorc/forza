# FORZA — Datos de prueba

> BD compartida entre main / develop / local. **No hay datos reales**, todo es de prueba.
> Reset con: `node scripts/seed-test-data.js --wipe`
> Dry-run (ver qué haría, sin tocar nada): `node scripts/seed-test-data.js`

## Qué borra y qué conserva

**Borra** (data de dominio): `athletes`, `guardians`, `plans`, `payments`, `sessions`,
`appointments`, `*_assessments`, `trial_sessions`, `trainer_blocks`,
`session_reschedule_history`, `notifications`.

**Conserva**: `auth.users`, `public.users`, `public.trainers` (las cuentas de
login: admin, entrenadores, nutricionista).

## Cuentas (no cambian)

| Rol | Email | Password |
|-----|-------|----------|
| super_admin | admin@forza.com | Forza2024! |
| trainer | trainer@forza.com | (ver .env) |

Trainers usados en los fixtures:
- **Dexter González** — `bbbb0001-0000-0000-0000-000000000001`
- **Camilo Rico** — `bbbb0001-0000-0000-0000-000000000002`

## Fixtures (todos con prefijo `PRUEBA` en el nombre)

Las fechas son relativas al día en que se corre el seed.

| # | Deportista | Estado | Entrenador | Plan | Pago | Para probar |
|---|-----------|--------|-----------|------|------|-------------|
| A1 | PRUEBA AlDia Pérez | active (M) | Dexter | momentum, 8 clases, inicio −15d | $150.000 **pagado** | caso feliz; badge "Al día"; tiene 1 acudiente |
| A2 | PRUEBA Debe Gómez | active (F) | Dexter | elite, 12 clases, inicio −20d | $520.000 **pendiente**, venció −21d | widget "Pagos vencidos" + badge "Debe $520.000" + FOR-76 |
| A3 | PRUEBA Parcial Ruiz | active (M) | Camilo | master, 8 clases, inicio −5d | $480.000 **parcial** (abonó $240.000), vence +10d | estado "parcial"; badge "Debe $240.000"; abonar |
| A4 | PRUEBA SinPlan Díaz | trial (F) | — | — | — | deportista sin plan ni entrenador; "Sin asignar" / "Sin plan activo" |
| A5 | PRUEBA Sesiones Torres | active (M) | Camilo | momentum, 4 clases, inicio −30d | $150.000 **pagado** | 3 sesiones (2 completadas, 1 pendiente) → "Restantes: 2"; FOR-62 (límite de clases) |

IDs fijos (por si hay que referenciarlos): athletes `f0a70000-…-0000000000N`,
plans `f0910000-…`, payments `f09a0000-…`, sessions `f0530000-…`, guardians `f09d0000-…`
(N = número de fila).

## Recetas de prueba manual (se crean desde la UI, no van en el seed)

### FOR-61 — crear deportista con pago inicial

Crear en `/deportistas/nuevo` con estos valores exactos:

| Campo | Valor |
|-------|-------|
| Nombre | `PRUEBA FOR61` |
| Apellido | `Vargas` |
| Género | Femenino |
| Fecha de nacimiento | `2013-04-15` |
| Estado | Activo |
| Entrenador | *(vacío — probar que es opcional)* |
| Plan → Tipo | Master |
| Plan → Nº de sesiones | `8` |
| Plan → Fecha de inicio | `2026-09-01` *(pasada, para que el vencimiento quede vencido)* |
| ☑ Registrar pago inicial | sí |
| Monto del plan | `480000` |
| Monto abonado ahora | `0` |
| Método | Transferencia |
| Referencia | `FOR61-MANUAL` |

Esperado:
- Vencimiento mostrado = **31/08/2026** (inicio − 1 día, solo lectura)
- Toast "Deportista, plan y pago inicial creados correctamente"
- Detalle → badge **"Debe $480.000"**
- `/pagos` → fila con PLAN = master, estado PENDIENTE
- Dashboard → aparece en "Pagos vencidos"

Al terminar: borrar el deportista `PRUEBA FOR61 Vargas`.

## Al crear data nueva durante desarrollo

Cuando un ticket necesite un escenario que no está arriba, se agrega el fixture a
`scripts/seed-test-data.js` y una fila a esta tabla — así queda versionado y ambos
lo tenemos. Los registros ad-hoc de una sola prueba: nombre con prefijo `ZZ-` y se
borran al terminar.
