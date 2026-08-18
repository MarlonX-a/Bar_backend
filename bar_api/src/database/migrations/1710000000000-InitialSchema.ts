import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class InitialSchema1710000000000 implements MigrationInterface {
  name = 'InitialSchema1710000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const hasRols = await queryRunner.hasTable('rols');
    if (!hasRols) {
      await queryRunner.createTable(
        new Table({
          name: 'rols',
          columns: [
            {
              name: 'idRol',
              type: 'integer',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'nombreRol', type: 'varchar' },
            { name: 'descripcionRol', type: 'varchar' },
            { name: 'fechaCreacion', type: 'timestamp', default: 'now()' },
            { name: 'fechaActualizacion', type: 'timestamp', default: 'now()' },
          ],
        }),
        true,
      );
    }

    const hasUsers = await queryRunner.hasTable('users');
    if (!hasUsers) {
      await queryRunner.createTable(
        new Table({
          name: 'users',
          columns: [
            {
              name: 'idUser',
              type: 'integer',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'correo', type: 'varchar', isUnique: true },
            { name: 'contrasenia', type: 'varchar' },
            { name: 'fechaCreacion', type: 'timestamp', default: 'now()' },
            { name: 'fechaActualizacion', type: 'timestamp', default: 'now()' },
            { name: 'idRol', type: 'integer', isNullable: true },
          ],
          foreignKeys: [
            new TableForeignKey({
              name: 'FK_users_rol',
              columnNames: ['idRol'],
              referencedTableName: 'rols',
              referencedColumnNames: ['idRol'],
            }),
          ],
        }),
        true,
      );
    }

    const hasPerfiles = await queryRunner.hasTable('perfiles');
    if (!hasPerfiles) {
      await queryRunner.createTable(
        new Table({
          name: 'perfiles',
          columns: [
            {
              name: 'idPerfil',
              type: 'integer',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'nombrePerfil', type: 'varchar' },
            { name: 'apellidoPerfil', type: 'varchar' },
            { name: 'celularPerfil', type: 'varchar' },
            { name: 'fotoPerfil', type: 'varchar' },
            { name: 'estado', type: 'boolean', default: true },
            { name: 'fechaDeCreacion', type: 'timestamp', default: 'now()' },
            {
              name: 'fechaDeActualización',
              type: 'timestamp',
              default: 'now()',
            },
            { name: 'idUser', type: 'integer', isNullable: true },
          ],
          uniques: [
            new TableUnique({
              name: 'REL_profiles_user',
              columnNames: ['idUser'],
            }),
          ],
          foreignKeys: [
            new TableForeignKey({
              name: 'FK_profiles_user',
              columnNames: ['idUser'],
              referencedTableName: 'users',
              referencedColumnNames: ['idUser'],
            }),
          ],
        }),
        true,
      );
    }
  }

  down(): Promise<void> {
    return Promise.reject(
      new Error(
        'The initial schema migration is a baseline and cannot be reverted automatically',
      ),
    );
  }
}
