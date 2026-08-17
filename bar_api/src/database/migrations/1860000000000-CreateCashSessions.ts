import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCashSessions1860000000000 implements MigrationInterface {
  name = 'CreateCashSessions1860000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE cash_sessions (
        id_cash_session uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        business_day_id uuid NOT NULL UNIQUE REFERENCES business_days(id_business_day) ON DELETE RESTRICT,
        status varchar(10) NOT NULL DEFAULT 'OPEN',
        opening_cents integer NOT NULL,
        expected_cents integer,
        declared_cents integer,
        difference_cents integer,
        opened_by_id integer NOT NULL REFERENCES users(id_user) ON DELETE RESTRICT,
        opened_at timestamptz NOT NULL,
        closed_by_id integer REFERENCES users(id_user) ON DELETE RESTRICT,
        closed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_cash_sessions_status" CHECK (status IN ('OPEN', 'CLOSED')),
        CONSTRAINT "CHK_cash_sessions_opening_non_negative" CHECK (opening_cents >= 0),
        CONSTRAINT "CHK_cash_sessions_expected_non_negative" CHECK (expected_cents IS NULL OR expected_cents >= 0),
        CONSTRAINT "CHK_cash_sessions_declared_non_negative" CHECK (declared_cents IS NULL OR declared_cents >= 0),
        CONSTRAINT "CHK_cash_sessions_closed_fields" CHECK (
          (status = 'OPEN' AND expected_cents IS NULL AND declared_cents IS NULL AND difference_cents IS NULL AND closed_by_id IS NULL AND closed_at IS NULL)
          OR
          (status = 'CLOSED' AND expected_cents IS NOT NULL AND declared_cents IS NOT NULL AND difference_cents IS NOT NULL AND closed_by_id IS NOT NULL AND closed_at IS NOT NULL)
        )
      )
    `);
    await queryRunner.query('CREATE INDEX "idx_cash_sessions_status" ON cash_sessions (status)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE cash_sessions');
  }
}
