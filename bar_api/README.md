# CholosBar API

Backend NestJS para autenticación, usuarios, roles y perfiles, con PostgreSQL y TypeORM.

## Requisitos

- Node.js 22 o superior.
- Bun 1.3.14.
- PostgreSQL.

## Configuración

1. Copia `.env.example` como `.env`.
2. Configura las credenciales de PostgreSQL.
3. Define un `JWT_SECRET` aleatorio de al menos 32 caracteres en producción.

La aplicación acepta `NODE_ENV=development`, `test` o `production` y carga primero `.env.<NODE_ENV>` y después `.env`.
La configuración se valida al iniciar; una variable obligatoria inválida detiene el proceso.

## Instalación y ejecución

```bash
bun install --frozen-lockfile
bun run build
bun run start:dev
```

Para producción:

```bash
bun install --frozen-lockfile
bun run build
bun run migration:run
bun run start:prod
```

El esquema no se sincroniza automáticamente. Las modificaciones de base de datos deben realizarse mediante migraciones revisables.

## Migraciones

```bash
# Ver migraciones pendientes
bun run migration:show

# Ejecutar migraciones compiladas
bun run migration:run

# Revertir una migración reversible
bun run migration:revert
```

La migración `InitialSchema1710000000000` es un baseline idempotente. En una base existente registra el estado sin recrear las tablas de negocio. Su reversión automática está bloqueada para evitar borrar datos accidentalmente.

## Operación

Endpoints de salud:

```text
GET /health/live   # proceso activo
GET /health/ready  # proceso activo y PostgreSQL disponible
GET /docs/openapi.json  # OpenAPI, cuando OPENAPI_ENABLED=true
```

Cada respuesta HTTP incluye `X-Request-Id`. El pipeline de CI se ejecuta en `.github/workflows/ci.yml` y valida instalación reproducible, lint, build, pruebas unitarias/E2E y auditoría de dependencias de producción. Docker no forma parte del flujo actual.

## Calidad

```bash
npm run build
npm run lint
npm test -- --runInBand
```

La prueba de integración PostgreSQL requiere `RUN_DATABASE_INTEGRATION=true` y una base dedicada. No debe ejecutarse contra una base compartida.

## Despliegue sin Docker

1. Use un usuario de sistema sin privilegios administrativos y ejecute `bun run build`.
2. Configure secretos mediante el gestor de secretos de su proveedor; no copie `.env` al repositorio ni a imágenes.
3. Ejecute `bun run migration:run` antes de publicar el proceso.
4. Termine TLS en un proxy confiable, defina `TRUST_PROXY=true` solo en ese caso y limite `CORS_ORIGINS` a los orígenes reales.
5. Configure comprobaciones `GET /health/live` y `GET /health/ready`; use SIGTERM para permitir apagado ordenado.
6. Mantenga copias de seguridad cifradas de PostgreSQL y pruebe periódicamente una restauración.

En producción, `OPENAPI_ENABLED` queda desactivado salvo que se establezca explícitamente en un entorno administrativo protegido.

## Estructura

- `src/auth`: registro, login y estrategia JWT.
- `src/users`: entidad y persistencia de usuarios.
- `src/rols`: CRUD actual de roles.
- `src/perfil`: CRUD de perfiles con ownership.
- `src/config`: validación de variables de entorno.
- `src/database`: opciones TypeORM, DataSource y migraciones.
