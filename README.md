# Rutik — Backend

API REST para **Rutik**, un SaaS de gestión de transporte escolar. Expone toda la lógica de
negocio que consume el panel administrativo [`rutik-frontend`](../rutik-frontend): empresas
(tenants), colegios, jornadas, conductores, vehículos, estudiantes, acudientes, rutas y
facturación mensual por estudiante.

## Stack

- **NestJS** (Node.js + TypeScript).
- **PostgreSQL** vía **TypeORM**.
- **JWT** (`@nestjs/jwt` + `passport-jwt`) para autenticación.
- **Swagger / OpenAPI** para documentación interactiva.
- Gestor de paquetes: **pnpm**.

## Requisitos previos

- Node.js y pnpm.
- PostgreSQL corriendo (localmente o vía Docker, ver abajo).

## Puesta en marcha

### Opción A — Docker (recomendada, levanta Postgres + pgAdmin + la API)

```bash
docker compose up
```

Esto levanta:
- `app` — la API en `http://localhost:3000`, con hot-reload (`start:dev`).
- `postgres` — Postgres 16, expuesto en el puerto `5433` del host.
- `pgadmin` — administrador visual de la base de datos en `http://localhost:5050`.

### Opción B — Local

```bash
pnpm install
cp .env.example .env   # ajustar credenciales si es necesario
pnpm run start:dev
```

Requiere una instancia de Postgres accesible con las credenciales de `.env`.

### Variables de entorno (`.env`)

```
PORT=3000
NODE_ENV=development
API_PREFIX=api

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=rutik_db

JWT_SECRET=change-this-secret-in-production
JWT_EXPIRATION=1d

# Solo si usas el pgAdmin del docker-compose
PGADMIN_PORT=5050
PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=admin
```

Una vez levantada, la API queda en `http://localhost:{PORT}/{API_PREFIX}` y el **Swagger UI** en
`http://localhost:{PORT}/{API_PREFIX}/docs` — es la referencia más actualizada de cada endpoint,
sus DTOs y respuestas.

## Scripts disponibles

| Script                        | Descripción                                                      |
|--------------------------------|-------------------------------------------------------------------|
| `pnpm run start:dev`           | Desarrollo con hot-reload                                          |
| `pnpm run build`               | Compila TypeScript a `dist/`                                       |
| `pnpm run start:prod`          | Corre el build compilado                                            |
| `pnpm run lint`                | ESLint con auto-fix                                                  |
| `pnpm run format`              | Prettier                                                              |
| `pnpm run test`                | Tests unitarios (Jest)                                                |
| `pnpm run test:e2e`            | Tests end-to-end                                                        |
| `pnpm run migration:generate`  | Genera una migración de TypeORM a partir de cambios en entidades         |
| `pnpm run migration:run`       | Aplica migraciones pendientes                                             |
| `pnpm run migration:revert`    | Revierte la última migración                                               |

> En desarrollo, `synchronize: true` sincroniza el esquema automáticamente desde las entidades
> (no hace falta migrar a mano); en producción está desactivado y todo cambio de esquema debe ir
> por migración.

## Arquitectura

Cada feature vive en `src/modules/<feature>/` siguiendo un diseño en capas (domain-driven, estilo
hexagonal):

```
src/modules/<feature>/
  domain/
    <feature>.entity.ts          # Entidad TypeORM, extiende BaseEntity
    enums/
    interfaces/
      <feature>.repository.ts    # Interfaz del repositorio + Symbol token
  application/
    <feature>.service.ts         # Lógica de negocio; inyecta el repositorio por Symbol
  infrastructure/
    api/
      controllers/                # Controllers de NestJS
      dto/                         # DTOs de entrada (class-validator) y de salida (class-transformer)
    repositories/
      <feature>.repository.impl.ts # Implementación TypeORM de la interfaz
  <feature>.module.ts             # Conecta el token de la interfaz con su implementación
```

**Convenciones clave:**
- Todas las entidades extienden `BaseEntity` (`src/shared/database/base.entity.ts`): UUID `id`,
  `createdAt`, `updatedAt` y soft-delete vía `deletedAt` (se borra con `softDelete()`, nunca con
  `DELETE` real).
- Los repositorios se inyectan por token `Symbol` (ej. `COMPANY_REPOSITORY`); cada `*.module.ts`
  hace el binding `{ provide: COMPANY_REPOSITORY, useClass: CompanyRepositoryImpl }`. Esto
  desacopla la lógica de negocio (`application/`) de TypeORM.
- Los controllers nunca devuelven la entidad directamente: siempre pasan por
  `plainToInstance(ResponseDto, entity, { excludeExtraneousValues: true })`, con DTOs de
  respuesta decorados con `@Expose()`.

**Middleware global (`main.ts`):**
- `ValidationPipe` — `whitelist` + `forbidNonWhitelisted` + `transform` (con conversión implícita
  de tipos).
- `TransformInterceptor` — envuelve toda respuesta exitosa como `{ data, statusCode, timestamp }`.
- `HttpExceptionFilter` — agrega `timestamp` y `path` a las respuestas de error.
- CORS habilitado globalmente.

**Infraestructura compartida (`src/shared/`):** setup de TypeORM (`database/`), configuración por
namespaces (`config/`: `app`, `database`, `jwt`), setup de Swagger con auth Bearer (`swagger/`).

**Utilidades comunes (`src/common/`):** guards (`JwtAuthGuard`, `RolesGuard`), decorador
`@Roles(...)` + `@CurrentUser()`, filtro e interceptor globales.

## Modelo de dominio

- **Company** — tenant principal del SaaS (una empresa de transporte escolar).
- **User** — roles `super_admin | admin | driver | guardian`. `driver` y `guardian` están
  pensados para una futura app móvil; hoy el panel web solo lo usan `super_admin` y `admin`.
- **School** / **SchoolSchedule** — colegios atendidos y sus jornadas.
- **Driver** / **Vehicle** — personal y flota operativa.
- **Guardian** / **Student** / **StudentGuardian** — acudientes, estudiantes y su relación N:M.
- **SchoolAssignment** — asigna conductor + vehículo a un colegio + jornada.
- **SchoolRoute** / **RouteStop** — ruta operativa (1:1 con una asignación) y sus paradas (una por
  estudiante).
- **StudentPayment** — registro de facturación mensual de un estudiante. Es un **libro contable
  inmutable**: una fila por `(studentId, billingMonth, billingYear)`, con `monthlyFee` y `dueDate`
  congelados en el momento de creación (no se recalculan si el estudiante cambia de mensualidad o
  de día de pago después). Ver [Ciclo de facturación](#ciclo-de-facturación).

## Autenticación

- `POST /api/auth/login` → `{ accessToken, refreshToken, tokenType, user }`.
- `POST /api/auth/refresh` → `{ accessToken, refreshToken, tokenType }`.
- Las rutas protegidas usan `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.X)` a nivel
  de controller o de método. `RolesGuard` deja pasar cualquier rol si el endpoint no declara
  `@Roles(...)`.

## Ciclo de facturación

`StudentPayment` no se crea automáticamente al crear un estudiante ni al cambiar de mes: alguien
tiene que **abrir el período**. Eso lo hace:

```
POST /api/student-payments/billing-cycle/generate   (solo super_admin)
```

- Siempre abre el **mes calendario siguiente** al día en que se ejecuta — correrlo el 1 o el 30
  de junio abre julio, nunca junio (`getNextBillingPeriod()` en
  `student-payments/application/due-date.util.ts`).
- Recorre todas las compañías con `status = ACTIVE` y, para cada una, crea una fila `PENDING` por
  cada estudiante activo cuyo rango de transporte cubra ese período y que **aún no tenga**
  registro para él.
- Es **idempotente**: volver a ejecutarlo para el mismo período no duplica nada, simplemente
  reporta esos estudiantes como omitidos.
- Devuelve un resumen con el período abierto, compañías procesadas y el detalle de
  creados/omitidos por compañía.

Es manual a propósito (lo dispara el super_admin desde el frontend, sección **Facturación**) — no
hay cron configurado todavía.

## Módulos (`src/modules/`)

`auth`, `company`, `user`, `school`, `school-schedules`, `students`, `guardians`,
`student-guardians`, `drivers`, `vehicles`, `school-assignments`, `school-routes`, `route-stops`,
`student-payments`, `dashboard`, `health`.

El **Dashboard** (`GET /api/dashboard`, solo `admin`) agrega en una sola llamada: KPIs generales,
estado de pagos y recaudo del período actual, próximos vencimientos y actividad reciente de
pagos — pensado para alimentar la pantalla de inicio del frontend sin múltiples round-trips.

## Formato de respuesta

Toda respuesta exitosa llega envuelta por el `TransformInterceptor`:

```json
{
  "data": { /* ... */ },
  "statusCode": 200,
  "timestamp": "2026-07-02T20:54:12.014Z"
}
```

Los errores pasan por `HttpExceptionFilter` y siempre incluyen `timestamp` y `path` además del
mensaje.

## Pendientes conocidos

- No todos los controllers tienen `@UseGuards`/`@Roles` aplicados todavía (por ejemplo,
  `CompanyController` no está restringido a `super_admin` a nivel de backend, aunque el frontend
  sí oculta esa sección). Cualquier endpoint nuevo debe llevar sus guards desde el inicio.
- El ciclo de facturación es 100% manual — si el negocio necesita que se abra solo (por ejemplo,
  un cron el último día de cada mes), falta conectarlo.
