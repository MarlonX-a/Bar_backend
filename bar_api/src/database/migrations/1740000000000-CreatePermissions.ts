import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePermissions1740000000000 implements MigrationInterface {
  name = 'CreatePermissions1740000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id_permission" SERIAL NOT NULL,
        "codigo_permiso" character varying(80) NOT NULL,
        "nombre_permiso" character varying(120) NOT NULL,
        "descripcion_permiso" character varying(255) NOT NULL,
        CONSTRAINT "PK_permissions" PRIMARY KEY ("id_permission"),
        CONSTRAINT "UQ_permissions_codigo" UNIQUE ("codigo_permiso")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role_id" integer NOT NULL,
        "permission_id" integer NOT NULL,
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id"),
        CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "rols"("id_rol") ON DELETE CASCADE,
        CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id_permission") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      INSERT INTO "permissions" ("codigo_permiso", "nombre_permiso", "descripcion_permiso") VALUES
      ('ROLE_MANAGE', 'Gestionar roles', 'Crear, consultar, actualizar y eliminar roles'),
      ('PROFILE_READ_SELF', 'Consultar perfil propio', 'Consultar el perfil del usuario autenticado'),
      ('PROFILE_WRITE_SELF', 'Gestionar perfil propio', 'Crear, actualizar y eliminar el perfil propio')
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id_rol", p."id_permission"
      FROM "rols" r CROSS JOIN "permissions" p
      WHERE r."codigo_rol" = 'ADMIN'
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id_rol", p."id_permission"
      FROM "rols" r JOIN "permissions" p ON p."codigo_permiso" IN ('PROFILE_READ_SELF', 'PROFILE_WRITE_SELF')
      WHERE r."codigo_rol" = 'CUSTOMER'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
  }
}
