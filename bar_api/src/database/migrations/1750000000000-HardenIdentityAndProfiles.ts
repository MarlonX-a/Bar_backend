import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenIdentityAndProfiles1750000000000
  implements MigrationInterface
{
  name = 'HardenIdentityAndProfiles1750000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const duplicates = (await queryRunner.query(
      `SELECT lower(correo) AS correo FROM users GROUP BY lower(correo) HAVING count(*) > 1`,
    )) as unknown[];
    if (duplicates.length > 0) {
      throw new Error('Cannot normalize email addresses while case-insensitive duplicates exist');
    }

    const profilesWithoutUser = (await queryRunner.query(
      `SELECT 1 FROM perfiles WHERE id_user IS NULL LIMIT 1`,
    )) as unknown[];
    if (profilesWithoutUser.length > 0) {
      throw new Error('Cannot require perfiles.id_user while orphan profiles exist');
    }

    await queryRunner.query(`UPDATE users SET correo = lower(trim(correo))`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_correo_normalized" ON users (lower(correo))`,
    );
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE perfiles ALTER COLUMN foto_perfil DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE perfiles ALTER COLUMN id_user SET NOT NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE perfiles ALTER COLUMN id_user DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE perfiles ALTER COLUMN foto_perfil SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN email_verified_at`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN password_changed_at`);
    await queryRunner.query(`DROP INDEX "UQ_users_correo_normalized"`);
  }
}
