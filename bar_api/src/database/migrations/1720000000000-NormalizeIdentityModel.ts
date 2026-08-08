import type { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeIdentityModel1720000000000
  implements MigrationInterface
{
  name = 'NormalizeIdentityModel1720000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "rols" RENAME COLUMN "idRol" TO "id_rol"',
    );
    await queryRunner.query(
      'ALTER TABLE "rols" RENAME COLUMN "nombreRol" TO "nombre_rol"',
    );
    await queryRunner.query(
      'ALTER TABLE "rols" RENAME COLUMN "descripcionRol" TO "descripcion_rol"',
    );
    await queryRunner.query(
      'ALTER TABLE "rols" RENAME COLUMN "fechaCreacion" TO "fecha_creacion"',
    );
    await queryRunner.query(
      'ALTER TABLE "rols" RENAME COLUMN "fechaActualizacion" TO "fecha_actualizacion"',
    );

    await queryRunner.query(
      'ALTER TABLE "users" RENAME COLUMN "idUser" TO "id_user"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" RENAME COLUMN "contrasenia" TO "password_hash"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" RENAME COLUMN "fechaCreacion" TO "fecha_creacion"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" RENAME COLUMN "fechaActualizacion" TO "fecha_actualizacion"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" RENAME COLUMN "idRol" TO "id_rol"',
    );

    await queryRunner.query(
      'ALTER TABLE "perfiles" RENAME COLUMN "idPerfil" TO "id_perfil"',
    );
    await queryRunner.query(
      'ALTER TABLE "perfiles" RENAME COLUMN "nombrePerfil" TO "nombre_perfil"',
    );
    await queryRunner.query(
      'ALTER TABLE "perfiles" RENAME COLUMN "apellidoPerfil" TO "apellido_perfil"',
    );
    await queryRunner.query(
      'ALTER TABLE "perfiles" RENAME COLUMN "celularPerfil" TO "celular_perfil"',
    );
    await queryRunner.query(
      'ALTER TABLE "perfiles" RENAME COLUMN "fotoPerfil" TO "foto_perfil"',
    );
    await queryRunner.query(
      'ALTER TABLE "perfiles" RENAME COLUMN "fechaDeCreacion" TO "fecha_creacion"',
    );
    await queryRunner.query(
      'ALTER TABLE "perfiles" RENAME COLUMN "fechaDeActualización" TO "fecha_actualizacion"',
    );
    await queryRunner.query(
      'ALTER TABLE "perfiles" RENAME COLUMN "idUser" TO "id_user"',
    );

    await queryRunner.query(
      'ALTER TABLE "rols" ADD COLUMN "codigo_rol" varchar',
    );
    await queryRunner.query(
      `UPDATE "rols"
       SET "codigo_rol" = CASE "id_rol"
         WHEN 1 THEN 'ADMIN'
         WHEN 2 THEN 'CUSTOMER'
         WHEN 3 THEN 'WORKER'
         ELSE COALESCE(
           NULLIF(upper(regexp_replace(trim("nombre_rol"), '[^A-Za-z0-9]+', '_', 'g')), ''),
           'ROLE_' || "id_rol"::text
         )
       END
       WHERE "codigo_rol" IS NULL`,
    );

    await queryRunner.query(
      `INSERT INTO "rols" ("codigo_rol", "nombre_rol", "descripcion_rol")
       SELECT 'ADMIN', 'Administrador', 'Acceso administrativo'
       WHERE NOT EXISTS (SELECT 1 FROM "rols" WHERE "codigo_rol" = 'ADMIN')`,
    );
    await queryRunner.query(
      `INSERT INTO "rols" ("codigo_rol", "nombre_rol", "descripcion_rol")
       SELECT 'CUSTOMER', 'Cliente', 'Usuario cliente'
       WHERE NOT EXISTS (SELECT 1 FROM "rols" WHERE "codigo_rol" = 'CUSTOMER')`,
    );
    await queryRunner.query(
      `INSERT INTO "rols" ("codigo_rol", "nombre_rol", "descripcion_rol")
       SELECT 'WORKER', 'Trabajador', 'Usuario trabajador'
       WHERE NOT EXISTS (SELECT 1 FROM "rols" WHERE "codigo_rol" = 'WORKER')`,
    );
    await queryRunner.query(
      'ALTER TABLE "rols" ALTER COLUMN "codigo_rol" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "rols" ADD CONSTRAINT "UQ_rols_codigo_rol" UNIQUE ("codigo_rol")',
    );

    await queryRunner.query(
      `UPDATE "users"
       SET "id_rol" = (SELECT "id_rol" FROM "rols" WHERE "codigo_rol" = 'CUSTOMER')
       WHERE "id_rol" IS NULL`,
    );
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "id_rol" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN "activo" boolean NOT NULL DEFAULT true',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN "perfil_completado" boolean NOT NULL DEFAULT false',
    );
    await queryRunner.query(
      `UPDATE "users" u
       SET "perfil_completado" = true
       WHERE EXISTS (SELECT 1 FROM "perfiles" p WHERE p."id_user" = u."id_user")`,
    );

    await queryRunner.query(
      `ALTER TABLE "rols"
       ALTER COLUMN "fecha_creacion" TYPE timestamptz
       USING "fecha_creacion" AT TIME ZONE current_setting('TIMEZONE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "rols"
       ALTER COLUMN "fecha_actualizacion" TYPE timestamptz
       USING "fecha_actualizacion" AT TIME ZONE current_setting('TIMEZONE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users"
       ALTER COLUMN "fecha_creacion" TYPE timestamptz
       USING "fecha_creacion" AT TIME ZONE current_setting('TIMEZONE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users"
       ALTER COLUMN "fecha_actualizacion" TYPE timestamptz
       USING "fecha_actualizacion" AT TIME ZONE current_setting('TIMEZONE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "perfiles"
       ALTER COLUMN "fecha_creacion" TYPE timestamptz
       USING "fecha_creacion" AT TIME ZONE current_setting('TIMEZONE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "perfiles"
       ALTER COLUMN "fecha_actualizacion" TYPE timestamptz
       USING "fecha_actualizacion" AT TIME ZONE current_setting('TIMEZONE')`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rols"
       ALTER COLUMN "fecha_creacion" TYPE timestamp
       USING "fecha_creacion" AT TIME ZONE current_setting('TIMEZONE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "rols"
       ALTER COLUMN "fecha_actualizacion" TYPE timestamp
       USING "fecha_actualizacion" AT TIME ZONE current_setting('TIMEZONE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users"
       ALTER COLUMN "fecha_creacion" TYPE timestamp
       USING "fecha_creacion" AT TIME ZONE current_setting('TIMEZONE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users"
       ALTER COLUMN "fecha_actualizacion" TYPE timestamp
       USING "fecha_actualizacion" AT TIME ZONE current_setting('TIMEZONE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "perfiles"
       ALTER COLUMN "fecha_creacion" TYPE timestamp
       USING "fecha_creacion" AT TIME ZONE current_setting('TIMEZONE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "perfiles"
       ALTER COLUMN "fecha_actualizacion" TYPE timestamp
       USING "fecha_actualizacion" AT TIME ZONE current_setting('TIMEZONE')`,
    );

    await queryRunner.query(
      'ALTER TABLE "users" DROP COLUMN "perfil_completado"',
    );
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "activo"');
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "id_rol" DROP NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "rols" DROP CONSTRAINT "UQ_rols_codigo_rol"',
    );
    await queryRunner.query('ALTER TABLE "rols" DROP COLUMN "codigo_rol"');

    await queryRunner.query(
      'ALTER TABLE "perfiles" RENAME COLUMN "id_user" TO "idUser"',
    );
    await queryRunner.query(
      'ALTER TABLE "perfiles" RENAME COLUMN "fecha_actualizacion" TO "fechaDeActualización"',
    );
    await queryRunner.query(
      'ALTER TABLE "perfiles" RENAME COLUMN "fecha_creacion" TO "fechaDeCreacion"',
    );
    await queryRunner.query(
      'ALTER TABLE "perfiles" RENAME COLUMN "foto_perfil" TO "fotoPerfil"',
    );
    await queryRunner.query(
      'ALTER TABLE "perfiles" RENAME COLUMN "celular_perfil" TO "celularPerfil"',
    );
    await queryRunner.query(
      'ALTER TABLE "perfiles" RENAME COLUMN "apellido_perfil" TO "apellidoPerfil"',
    );
    await queryRunner.query(
      'ALTER TABLE "perfiles" RENAME COLUMN "nombre_perfil" TO "nombrePerfil"',
    );
    await queryRunner.query(
      'ALTER TABLE "perfiles" RENAME COLUMN "id_perfil" TO "idPerfil"',
    );

    await queryRunner.query(
      'ALTER TABLE "users" RENAME COLUMN "id_rol" TO "idRol"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" RENAME COLUMN "fecha_actualizacion" TO "fechaActualizacion"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" RENAME COLUMN "fecha_creacion" TO "fechaCreacion"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" RENAME COLUMN "password_hash" TO "contrasenia"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" RENAME COLUMN "id_user" TO "idUser"',
    );

    await queryRunner.query(
      'ALTER TABLE "rols" RENAME COLUMN "fecha_actualizacion" TO "fechaActualizacion"',
    );
    await queryRunner.query(
      'ALTER TABLE "rols" RENAME COLUMN "fecha_creacion" TO "fechaCreacion"',
    );
    await queryRunner.query(
      'ALTER TABLE "rols" RENAME COLUMN "descripcion_rol" TO "descripcionRol"',
    );
    await queryRunner.query(
      'ALTER TABLE "rols" RENAME COLUMN "nombre_rol" TO "nombreRol"',
    );
    await queryRunner.query(
      'ALTER TABLE "rols" RENAME COLUMN "id_rol" TO "idRol"',
    );
  }
}
