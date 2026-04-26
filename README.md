# FORZA — Plataforma de Gestión Deportiva

Plataforma web mobile-first para digitalizar la operación de un centro de entrenamiento personalizado de fútbol a domicilio en Medellín. Reemplaza la gestión actual por WhatsApp + Google Calendar.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Angular 17+ + Angular Material + SCSS |
| Backend | NestJS (Node.js + TypeScript) |
| Base de datos | Supabase (PostgreSQL) |
| Monorepo | Nx Workspace |
| Deploy FE | Vercel (pendiente) |
| Deploy BE | Railway (pendiente) |

---

## Estructura del proyecto

```
forza/
├── apps/
│   ├── web/          ← Angular (localhost:4200)
│   └── api/          ← NestJS (localhost:3000)
└── libs/
    └── shared/       ← DTOs compartidos entre frontend y backend
```

---

## Requisitos previos

- Node.js 18+
- npm 9+
- Nx CLI: `npm install -g nx`
- Cuenta en Supabase

---

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/forza.git
cd forza

# Instalar dependencias
npm install
```

---

## Variables de entorno

Crea un archivo `.env` en la raíz de `apps/api/`:

```bash
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
API_PORT=3000
API_PREFIX=api
NODE_ENV=development
JWT_SECRET=tu_jwt_secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:4200
```

> ⚠️ Nunca subas el `.env` al repositorio. Está incluido en `.gitignore`.

---

## Correr el proyecto

```bash
# Backend (NestJS)
npx nx serve api

# Frontend (Angular) — próximamente
npx nx serve web
```

---

## Endpoints principales

| Módulo | Base URL |
|--------|----------|
| Auth | `/api/auth` |
| Deportistas | `/api/athletes` |
| Planes | `/api/plans` |
| Sesiones | `/api/sessions` |
| Agenda | `/api/schedule` |
| Admin | `/api/admin/users` |
| Confirmación acudiente | `/api/confirm` ← público |

---

## Roles del sistema

| Rol | Descripción |
|-----|-------------|
| `super_admin` | Acceso total, puede eliminar registros |
| `admin` | Gestión general, no puede eliminar |
| `trainer` | Ve y gestiona solo sus deportistas y sesiones |
| `nutritionist` | Acceso al módulo nutricional (Fase 2) |

---

## Funcionalidad core — Doble confirmación de sesiones

El flujo de confirmación de clases funciona así:

1. El entrenador registra la sesión desde su celular
2. El entrenador confirma asistencia → `PATCH /api/sessions/:id/confirm-trainer`
3. El admin copia el link de confirmación y lo envía por WhatsApp al acudiente
4. El acudiente confirma desde el link **sin necesidad de login** → `POST /api/confirm`
5. El sistema actualiza el estado automáticamente

Estados posibles:
- `pending` → ninguno confirmó
- `partial` → solo el entrenador confirmó
- `verified` → ambos confirmaron ✅
- `conflict` → entrenador sí, acudiente no ⚠️

---

## Tests

```bash
# Correr tests unitarios
npx nx test api
```

---

## Estado del desarrollo

- [x] Setup monorepo Nx
- [x] Supabase schema + triggers
- [x] Auth module (JWT)
- [x] Athletes module
- [x] Plans module
- [x] Sessions module + doble confirmación
- [x] Schedule module
- [x] Admin module
- [ ] Frontend Angular
- [ ] Deploy (Vercel + Railway)

---

## Identidad visual

```
Color primario:   #c99734  (Satin Sheen Gold)
Color secundario: #535353  (Davy's Gray)
Negro:            #0d0d0d
Tipografía:       Cairo (Google Fonts)
```
