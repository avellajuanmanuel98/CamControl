# CamControl

Sistema web para gestionar y monitorear cámaras de seguridad EZVIZ:
sedes, inventario de cámaras, código QR de configuración, y estado de
conectividad prácticamente en tiempo real, reemplazando la hoja de cálculo
usada anteriormente.

Ver [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) para el análisis técnico
completo (por qué esta arquitectura, cómo se determina el estado de una
cámara, seguridad, etc.).

## Stack

- **Frontend:** Vue 3 + Vite + TypeScript + Pinia + Vue Router
- **Backend:** Node.js + Express + TypeScript + Prisma ORM
- **Base de datos:** PostgreSQL
- **Monitoreo:** EZVIZ Open Platform API (oficial) + worker en background + Server-Sent Events

## Requisitos

- Node.js 20+
- PostgreSQL 14+ (o usa `docker-compose.yml`, que levanta todo)

## Puesta en marcha (desarrollo local, sin Docker)

```bash
# 1. Base de datos
createuser camcontrol --pwprompt --createdb   # o usa tu propio Postgres
createdb -O camcontrol camcontrol

# 2. Variables de entorno
cp .env.example backend/.env
cp .env.example frontend/.env
# Edita backend/.env: DATABASE_URL, JWT_SECRET, CREDENTIALS_ENCRYPTION_KEY (genera con:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# )

# 3. Backend
cd backend
npm install
npm run prisma:migrate   # crea las tablas
npm run seed             # usuario admin + sedes iniciales
npm run dev               # http://localhost:4000

# 4. Frontend (otra terminal)
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Usuario inicial (definido en `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` del `.env`):
`admin@camcontrol.local` / `ChangeMe123!` — **cámbialo en producción**.

## Puesta en marcha con Docker

```bash
cp .env.example .env
docker compose up --build
```

## Estructura del repositorio

```
backend/    API REST + worker de monitoreo (Express + Prisma + PostgreSQL)
frontend/   SPA de gestión y dashboard (Vue 3 + Vite)
docs/       Documentación técnica (arquitectura, decisiones de diseño)
```

## Habilitar el monitoreo automático (EZVIZ)

1. Inicia sesión como admin.
2. Registra una cuenta developer en la EZVIZ Open Platform y obtén
   `AppKey`/`AppSecret`.
3. Guárdalas con:
   ```bash
   curl -X POST http://localhost:4000/api/monitoring/credentials \
     -H "Authorization: Bearer <token-admin>" -H "Content-Type: application/json" \
     -d '{"label":"Principal","appKey":"...","appSecret":"..."}'
   ```
   (Próximamente esto tendrá una pantalla dedicada en el frontend; por ahora
   es API-only para no exponer el flujo de credenciales antes de tener
   confirmado el acceso developer.)
4. Completa el campo "Serial EZVIZ" de cada cámara (se autocompleta al subir
   el QR si el texto decodificado lo contiene).
5. El worker en background (intervalo configurable con
   `MONITOR_INTERVAL_SECONDS`) empezará a verificar el estado automáticamente.

## Roles

- **ADMIN:** todo, incluida gestión de usuarios y credenciales EZVIZ.
- **OPERATOR:** gestiona sedes, cámaras, QR e importaciones.
- **VIEWER:** solo lectura del dashboard y listados.
