# CholosBar API

Backend NestJS para autenticación, usuarios, roles y perfiles, con PostgreSQL y TypeORM.

## Requisitos

- Node.js 22 o superior.
- npm 10.9.2 o compatible.
- PostgreSQL.

## Configuración

1. Copia `.env.example` como `.env`.
2. Configura las credenciales de PostgreSQL.
3. Define un `JWT_SECRET` aleatorio de al menos 32 caracteres en producción.

La aplicación acepta `NODE_ENV=development`, `test` o `production` y carga primero `.env.<NODE_ENV>` y después `.env`.
La configuración se valida al iniciar; una variable obligatoria inválida detiene el proceso.

## Instalación y ejecución

```bash
npm install
npm run build
npm run start:dev
```

Para producción:

```bash
npm ci
npm run build
npm run migration:run
npm run start:prod
```

El esquema no se sincroniza automáticamente. Las modificaciones de base de datos deben realizarse mediante migraciones revisables.

## Migraciones

```bash
# Ver migraciones pendientes
npm run migration:show

# Ejecutar migraciones compiladas
npm run migration:run

# Revertir una migración reversible
npm run migration:revert
```

La migración `InitialSchema1710000000000` es un baseline idempotente. En una base existente registra el estado sin recrear las tablas de negocio. Su reversión automática está bloqueada para evitar borrar datos accidentalmente.

## Operación

Endpoints de salud:

```text
GET /health/live   # proceso activo
GET /health/ready  # proceso activo y PostgreSQL disponible
```

Cada respuesta HTTP incluye `X-Request-Id`. El pipeline de CI se ejecuta en `.github/workflows/ci.yml` y valida instalación reproducible, lint, build, pruebas unitarias/E2E y auditoría de dependencias de producción. Docker no forma parte del flujo actual.

## Calidad

```bash
npm run build
npm run lint
npm test -- --runInBand
```

El E2E requiere una base de datos de pruebas aislada. No debe ejecutarse contra una base compartida.

## Estructura

- `src/auth`: registro, login y estrategia JWT.
- `src/users`: entidad y persistencia de usuarios.
- `src/rols`: CRUD actual de roles.
- `src/perfil`: CRUD de perfiles con ownership.
- `src/config`: validación de variables de entorno.
- `src/database`: opciones TypeORM, DataSource y migraciones.
