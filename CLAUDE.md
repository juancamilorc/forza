# CLAUDE.md — FORZA Platform
> Master context file for Claude Code. Read this before ANY task.
> Last updated: May 2026 | Version: 1.0

---

## 1. PROJECT IDENTITY

**FORZA** is a web platform for an elite personalized football training center in Medellín, Colombia.
It replaces WhatsApp + Google Calendar with a professional digital system.

**Business context:**
- 10 trainers, 1 nutritionist
- Athletes aged 3–17 (and some adults)
- Sessions happen in fields/parks across Medellín
- Parents (acudientes) confirm sessions via WhatsApp link
- Payments are manual (no gateway in MVP)

**Developer:** Juan Camilo — knows Angular well, learning NestJS. Prefers step-by-step with real examples.

---

## 2. STACK

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 21 (standalone components, signals) |
| Backend | NestJS (Node.js + TypeScript) |
| Database | Supabase (PostgreSQL) |
| Monorepo | Nx Workspace |
| Styling | SCSS (NO Tailwind, NO Angular Material in main UI) |
| Auth | JWT (NestJS signs its own token, NOT Supabase token) |
| Shared | libs/shared (DTOs shared between FE and BE) |

---

## 3. MONOREPO STRUCTURE

```
forza/
├── apps/
│   ├── web/                          ← Angular 21 (localhost:4200)
│   │   └── src/app/
│   │       ├── core/
│   │       │   ├── services/         ← HTTP services (one per resource)
│   │       │   ├── interceptors/     ← auth.interceptor.ts
│   │       │   └── guards/           ← auth.guard.ts
│   │       ├── features/             ← one folder per module
│   │       │   ├── auth/login/
│   │       │   ├── dashboard/
│   │       │   ├── athletes/
│   │       │   │   ├── athletes-list/
│   │       │   │   ├── athlete-detail/
│   │       │   │   └── athlete-form/
│   │       │   ├── sessions/
│   │       │   │   ├── sessions-list/
│   │       │   │   └── session-form/
│   │       │   ├── schedule/
│   │       │   ├── assessments/
│   │       │   ├── payments/
│   │       │   ├── videos/
│   │       │   └── admin/
│   │       └── shared/
│   │           └── components/
│   │               ├── shell/        ← sidebar + topbar
│   │               └── toast/        ← notifications
│   └── api/                          ← NestJS (localhost:3000)
│       └── src/
│           ├── app/app.module.ts
│           ├── supabase/
│           ├── auth/
│           ├── athletes/
│           ├── plans/
│           ├── sessions/
│           ├── schedule/
│           ├── admin/                ← users + trainers controllers
│           ├── assessments/
│           ├── payments/
│           └── videos/
└── libs/
    └── shared/src/lib/dtos/
        ├── athlete/
        ├── plan/
        ├── session/
        ├── appointment/
        ├── user/
        ├── assessment/
        ├── payment/
        └── video/
```

---

## 4. ARCHITECTURE RULES

### Backend (NestJS)
- Every module has: `module.ts`, `service.ts`, `controller.ts`
- DTOs live in `libs/shared` — shared between FE and BE
- ALL controllers use `@UseGuards(JwtAuthGuard, RolesGuard)`
- Use `@Roles()` decorator to control access per endpoint
- Supabase is accessed ONLY through `SupabaseService` with `SERVICE_ROLE_KEY`
- NEVER use Supabase anon key in the backend
- Calculated fields (nutrition formulas) are computed in the service, NEVER in the DB
- `UpdateDto` always extends `PartialType(CreateDto)` from `@nestjs/mapped-types`

### Frontend (Angular 21)
- ALL components are standalone (no NgModules)
- Use signals for ALL state: `signal()`, `computed()`, `effect()`
- Use `inject()` instead of constructor injection
- NO `ngModel` — use `[value]` + `(input)` or `(change)` pattern
- HTTP services use `HttpClient` with `inject()`
- Navigation uses `Router` with `inject()`
- NEVER use localStorage directly — always check `isPlatformBrowser`
- Use `@for`, `@if`, `@empty` (Angular 17+ control flow)
- Lazy load ALL feature routes with `loadComponent`

### Database (Supabase)
- ALL new tables need RLS enabled + permissive policy for service role
- Use `uuid` for all IDs, generated with `gen_random_uuid()`
- ALL tables have `created_at` and `updated_at` with trigger
- Foreign keys use `ON DELETE` carefully — prefer soft deletes
- Calculated fields are NOT stored — computed in backend

---

## 5. AUTH FLOW

```
1. POST /auth/login → Supabase verifies email/password
2. NestJS queries public.users → gets role
3. NestJS signs its OWN JWT with JWT_SECRET (NOT Supabase token)
4. Token payload: { sub, email, role }
5. Every protected request → JwtAuthGuard → RolesGuard
6. Frontend stores token in localStorage (or sessionStorage if no "remember me")
```

**CRITICAL:** `trainer_id` in sessions table = ID from `trainers` table, NOT from `users` table.

---

## 6. ROLES & PERMISSIONS

| Action | super_admin | admin | trainer | nutritionist |
|--------|-------------|-------|---------|--------------|
| CRUD users | ✅ | ✅ | ❌ | ❌ |
| View all athletes | ✅ | ✅ | own only | own only |
| Create/edit athletes | ✅ | ✅ | ❌ | ❌ |
| Register sessions | ✅ | ✅ | ✅ own | ❌ |
| Confirm session | ✅ | ✅ | ✅ own | ❌ |
| Edit nutritional assessment | ✅ | 👁 view | ❌ | ✅ |
| Edit technical/physical | ✅ | 👁 view | ✅ | ❌ |
| Manage payments | ✅ | ✅ | ❌ | ❌ |
| Upload videos | ✅ | ✅ | ❌ | ❌ |
| View videos | ✅ | ✅ | ✅ | ❌ |
| Delete records | ✅ | ❌ | ❌ | ❌ |
| Freeze/cancel plans | ✅ | ✅ | ❌ | ❌ |

---

## 7. API ENDPOINTS (complete)

```
POST   /api/auth/login
GET    /api/auth/profile
GET    /api/auth/trainer-id        ← returns trainer table id for logged user

GET    /api/athletes
POST   /api/athletes
GET    /api/athletes/:id
PATCH  /api/athletes/:id
DELETE /api/athletes/:id

GET    /api/plans
POST   /api/plans
GET    /api/plans/:id
PATCH  /api/plans/:id
DELETE /api/plans/:id
PATCH  /api/plans/:id/freeze
PATCH  /api/plans/:id/unfreeze
PATCH  /api/plans/:id/cancel

GET    /api/sessions
POST   /api/sessions
GET    /api/sessions/:id
PATCH  /api/sessions/:id
PATCH  /api/sessions/:id/confirm-trainer
PATCH  /api/sessions/:id/cancel
POST   /api/sessions/:id/reschedule
DELETE /api/sessions/:id
POST   /api/confirm                ← public, no JWT (guardian confirmation)

GET    /api/schedule
POST   /api/schedule
GET    /api/schedule/:id
PATCH  /api/schedule/:id
DELETE /api/schedule/:id

GET    /api/assessments/nutritional
POST   /api/assessments/nutritional
GET    /api/assessments/nutritional/:id
PATCH  /api/assessments/nutritional/:id

GET    /api/assessments/technical
POST   /api/assessments/technical
GET    /api/assessments/technical/:id
PATCH  /api/assessments/technical/:id

GET    /api/assessments/physical
POST   /api/assessments/physical
GET    /api/assessments/physical/:id
PATCH  /api/assessments/physical/:id

GET    /api/payments
POST   /api/payments
GET    /api/payments/:id
PATCH  /api/payments/:id
PATCH  /api/payments/:id/abonar
DELETE /api/payments/:id

GET    /api/videos
POST   /api/videos
GET    /api/videos/:id
PATCH  /api/videos/:id
DELETE /api/videos/:id

GET    /api/admin/users
POST   /api/admin/users
GET    /api/admin/users/:id
PATCH  /api/admin/users/:id
PATCH  /api/admin/users/:id/toggle-active
GET    /api/admin/trainers         ← returns trainers with user info
```

---

## 8. DATABASE TABLES

```
auth.users          ← Supabase managed
public.users        ← roles, full_name, is_active (FK → auth.users)
public.trainers     ← trainer profile (FK → users)
public.athletes     ← athlete data + gender + status
public.guardians    ← parent/guardian data (FK → athletes)
public.plans        ← training plans + freeze logic
public.sessions     ← sessions + double confirmation + reschedule
public.appointments ← schedule/agenda
public.nutritional_assessments  ← formulas auto-calculated
public.technical_assessments    ← ball control, passing, definition
public.physical_assessments     ← mobility, jumps, sprint
public.payments                 ← manual payments + partial (abonos)
public.training_videos          ← YouTube/Drive links
```

**ENUMs:**
- `user_role`: super_admin | admin | trainer | nutritionist
- `athlete_status`: active | inactive | trial
- `plan_type`: momentum | momentum_pro | master | master_pro | frz | frz_pro | elite | elite_pro | addicted_to_football

---

## 9. NUTRITIONAL FORMULAS (auto-calculated in backend)

```typescript
sumatoria = sum(6 pliegues)
porcentaje_grasa = sexo === 'M'
  ? 0.1051 * sumatoria + 2.585
  : 0.1548 * sumatoria + 3.58
peso_graso = peso * (porcentaje_grasa / 100)
masa_libre_grasa = peso - peso_graso
iaks = (masa_libre_grasa * 100000) / Math.pow(talla_cm, 3)
imlg = masa_libre_grasa / Math.pow(talla_m, 2)
imc = peso / Math.pow(talla_m, 2)
complexion_osea = talla_cm / perimetro_muneca_cm
peso_ideal = masa_libre_grasa / (1 - grasa_deseada / 100)
```

---

## 10. DESIGN SYSTEM

```scss
// Colors
$gold:       #c99734;  // primary brand
$dark:       #0d0d0d;  // sidebar background
$surface:    #1c1c1c;  // topbar, sidebar
$content-bg: #f5f5f5;  // main content area
$card-bg:    #ffffff;  // cards
$text-dark:  #1a1a1a;  // main text
$text-mid:   #535353;  // secondary text
$border:     #e5e5e5;  // card borders

// Status colors
$active:    #4ade80 / #15803d;
$inactive:  #f87171 / #b91c1c;
$trial:     #fbbf24 / #b45309;
$pending:   #fbbf24 / #b45309;
$partial:   #60a5fa / #1d4ed8;
$verified:  #4ade80 / #15803d;

// Role badge colors
$super_admin:  gold (#c99734)
$admin:        gray (#535353)
$trainer:      blue (#60a5fa)
$nutritionist: green (#4ade80)

// Typography
font-family: 'Cairo', sans-serif;
weights: 300 | 400 | 500 | 600 | 700 | 900
```

**Layout:**
- Sidebar: 240px fixed, dark (#1c1c1c), gold border-left on active
- Topbar: 64px sticky, dark (#1c1c1c)
- Content: padding 32px, background #f5f5f5
- Cards: white, border 1px #e5e5e5, border-radius 12px

---

## 11. ENVIRONMENT VARIABLES

```bash
# Backend (apps/api/.env)
SUPABASE_URL=https://nhegevwfgunvberilthm.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
JWT_EXPIRES_IN=7d
API_PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:4200

# Frontend (apps/web/src/environments/environment.ts)
apiUrl: 'http://localhost:3000/api'
```

---

## 12. TEST CREDENTIALS

```
Super Admin:
  email:    admin@forza.com
  password: Forza2024!
  user_id:  16fa562a-4d41-4b97-84bc-a5231bf89c14
  trainer_id (in trainers table): a0f9f3be-23d0-4e64-9cec-5f82b366c2d0

Trainer:
  email:    trainer@forza.com
  password: Forza2024!
```

---

## 13. KNOWN GOTCHAS (don't repeat these mistakes)

1. `trainer_id` in sessions = ID from `trainers` table, NOT `users` table
2. `assessments` old table was deleted — use `nutritional_assessments`, `technical_assessments`, `physical_assessments`
3. `localStorage is not defined` in SSR → always use `isPlatformBrowser`
4. NestJS uses its OWN JWT — never use Supabase token in guards
5. `gender` field must be in `CreateAthleteDto` or `forbidNonWhitelisted` rejects it
6. New Supabase tables need RLS enabled + permissive policy even with SERVICE_ROLE_KEY
7. `PartialType` requires `@nestjs/mapped-types` installed separately
8. Angular `@for` with `<a routerLink>` can cause template errors — use `<button (click)="navigate()">` instead
9. `date pipe` with locale needs `registerLocaleData(localeEs)` + `{ provide: LOCALE_ID, useValue: 'es-CO' }` in app.config.ts
10. Sessions `confirmation_status` is auto-updated by Supabase trigger

---

## 14. CURRENT FRONTEND STATUS

| Screen | Status |
|--------|--------|
| Login | ✅ Complete |
| Shell (sidebar + topbar) | ✅ Complete |
| Dashboard (real data) | ✅ Complete |
| Athletes list | ✅ Complete |
| Athlete detail | ✅ Complete (plan/sessions/evaluations = "coming soon") |
| Athlete form (create/edit) | ✅ Complete |
| Sessions list | ✅ Complete |
| Session form (create) | 🔄 In progress |
| Schedule | ❌ Pending |
| Assessments | ❌ Pending |
| Payments | ❌ Pending |
| Videos | ❌ Pending |
| Admin users | ❌ Pending |

---

## 15. BUSINESS DECISIONS (FINAL)

- Videos → YouTube/Drive links only, no file upload
- Payments → manual registration, no gateway in MVP (Wompi is Phase 2)
- Guardian portal → no login in MVP, only confirms via link
- PDF reports → Phase 2 (MVP = web printable view)
- Nutritional formulas → auto-calculated in backend
- Classifications → always manual (semáforo) — context-dependent
- Session types: normal (in plan) | extra (plan ended, billed separately) | reposition (cancelled session, no extra cost)

---

## 16. PHASE 2 (out of MVP scope)

- Guardian portal with login
- PDF assessment reports
- WhatsApp Business API
- Wompi payment gateway
- Nutritionist profile table
- Push notifications (class reminder, plan expiring)
- Payment receipt by email
- Freeze plan by guardian (injury/medical)
- Session extra billing flow
