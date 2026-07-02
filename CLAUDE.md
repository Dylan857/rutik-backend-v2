# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rutik is a **School Transportation SaaS** backend built with NestJS, TypeScript, PostgreSQL (TypeORM), and JWT authentication. Package manager is **pnpm**.

## Commands

```bash
pnpm install            # Install dependencies
pnpm run start:dev      # Development with file watching
pnpm run build          # Compile TypeScript
pnpm run start:prod     # Run compiled output

pnpm run lint           # ESLint with auto-fix
pnpm run format         # Prettier format

pnpm run test           # Unit tests (Jest)
pnpm run test:watch     # Unit tests in watch mode
pnpm run test:cov       # Unit tests with coverage
pnpm run test:e2e       # E2E tests (test/jest-e2e.json config)

# TypeORM migrations (require .env to be set up)
pnpm run migration:generate -- src/database/migrations/MigrationName
pnpm run migration:run
pnpm run migration:revert
```

Unit tests live alongside source files (`*.spec.ts`) under `src/`; Jest is configured with `rootDir: "src"`.

## Environment Variables

Create a `.env` file at the project root:

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
```

Swagger UI is available at `http://localhost:{PORT}/{API_PREFIX}/docs`.

## Architecture

The project follows a **layered domain-driven design**. Each feature lives under `src/modules/<feature>/` with this structure:

```
src/modules/<feature>/
  domain/
    <feature>.entity.ts          # TypeORM entity extending BaseEntity
    enums/                       # Domain enums
    interfaces/
      <feature>.repository.ts    # Repository interface + Symbol token
  application/
    <feature>.service.ts         # Business logic; injects repository via Symbol
  infrastructure/
    api/
      controllers/               # NestJS controllers
      dto/                       # class-validator DTOs, class-transformer response DTOs
    repositories/
      <feature>.repository.impl.ts  # TypeORM repository implementation
  <feature>.module.ts            # Wires interface token → implementation
```

**Key conventions:**
- All entities extend `BaseEntity` (`src/shared/database/base.entity.ts`) which provides UUID `id`, `createdAt`, `updatedAt`, and soft-delete `deletedAt` columns. Soft deletes use TypeORM's `softDelete()`.
- Repository interfaces are injected via `Symbol` tokens (e.g. `COMPANY_REPOSITORY`). The module binds `{ provide: COMPANY_REPOSITORY, useClass: CompanyRepositoryImpl }`.
- Controllers use `plainToInstance(ResponseDto, entity, { excludeExtraneousValues: true })` to map entities to response DTOs decorated with `@Expose()`.

**Global middleware (applied in `main.ts`):**
- `ValidationPipe` — whitelist, forbidNonWhitelisted, transform with implicit conversion.
- `TransformInterceptor` — wraps all successful responses as `{ data, statusCode, timestamp }`.
- `HttpExceptionFilter` — adds `timestamp` and `path` to error responses.
- CORS is enabled globally.

**Shared infrastructure (`src/shared/`):**
- `database/database.module.ts` — TypeORM async setup; `synchronize: true` in non-production, `false` in production.
- `database/data-source.ts` — standalone `DataSource` used by TypeORM CLI for migrations.
- `config/` — NestJS `registerAs` config namespaces: `app`, `database`, `jwt`.
- `swagger/swagger.setup.ts` — Swagger/OpenAPI setup with Bearer auth.

**Common utilities (`src/common/`):**
- `filters/`, `interceptors/` — global filter and interceptor (see above).
- `decorators/`, `guards/` — placeholder barrel files; JWT guards/decorators will live here.
