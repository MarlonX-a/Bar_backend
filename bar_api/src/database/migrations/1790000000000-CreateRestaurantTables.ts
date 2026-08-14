import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRestaurantTables1790000000000 implements MigrationInterface {
  name = 'CreateRestaurantTables1790000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE restaurant_tables (
        id_table uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        code varchar(50) NOT NULL UNIQUE,
        capacity integer NOT NULL,
        qr_token_hash varchar(64) NOT NULL UNIQUE,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_restaurant_tables_capacity" CHECK (capacity > 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE table_sessions (
        id_table_session uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        table_id uuid NOT NULL REFERENCES restaurant_tables(id_table) ON DELETE RESTRICT,
        session_token_hash varchar(64) NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "idx_table_sessions_table_expires" ON table_sessions (table_id, expires_at)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE table_sessions');
    await queryRunner.query('DROP TABLE restaurant_tables');
  }
}
