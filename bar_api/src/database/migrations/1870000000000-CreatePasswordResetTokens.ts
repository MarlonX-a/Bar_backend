import { MigrationInterface, QueryRunner } from 'typeorm';
export class CreatePasswordResetTokens1870000000000 implements MigrationInterface {
  name = 'CreatePasswordResetTokens1870000000000';
  async up(queryRunner: QueryRunner): Promise<void> { await queryRunner.query(`CREATE TABLE password_reset_tokens (id_password_reset_token uuid PRIMARY KEY DEFAULT uuid_generate_v4(), user_id integer NOT NULL REFERENCES users(id_user) ON DELETE CASCADE, token_hash varchar(64) NOT NULL UNIQUE, expires_at timestamptz NOT NULL, used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now())`); await queryRunner.query('CREATE INDEX "idx_password_reset_tokens_user_expires" ON password_reset_tokens (user_id, expires_at)'); }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE password_reset_tokens'); }
}
