import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayments1840000000000 implements MigrationInterface {
  name = 'CreatePayments1840000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE payments (
        id_payment uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id uuid NOT NULL UNIQUE REFERENCES orders(id_order) ON DELETE RESTRICT,
        amount_cents integer NOT NULL,
        method varchar(10) NOT NULL,
        status varchar(10) NOT NULL DEFAULT 'PENDING',
        reference varchar(120),
        declared_by_id integer NOT NULL REFERENCES users(id_user) ON DELETE RESTRICT,
        verified_by_id integer REFERENCES users(id_user) ON DELETE RESTRICT,
        verified_at timestamptz,
        rejected_by_id integer REFERENCES users(id_user) ON DELETE RESTRICT,
        rejected_at timestamptz,
        rejection_reason varchar(500),
        voided_by_id integer REFERENCES users(id_user) ON DELETE RESTRICT,
        voided_at timestamptz,
        void_reason varchar(500),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_payments_amount_non_negative" CHECK (amount_cents >= 0),
        CONSTRAINT "CHK_payments_method" CHECK (method IN ('CASH', 'TRANSFER', 'OTHER')),
        CONSTRAINT "CHK_payments_status" CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED', 'VOIDED')),
        CONSTRAINT "CHK_payments_verified_fields" CHECK (
          (status <> 'VERIFIED') OR (verified_by_id IS NOT NULL AND verified_at IS NOT NULL)
        ),
        CONSTRAINT "CHK_payments_rejected_fields" CHECK (
          (status <> 'REJECTED') OR (rejected_by_id IS NOT NULL AND rejected_at IS NOT NULL AND rejection_reason IS NOT NULL)
        ),
        CONSTRAINT "CHK_payments_voided_fields" CHECK (
          (status <> 'VOIDED') OR (voided_by_id IS NOT NULL AND voided_at IS NOT NULL AND void_reason IS NOT NULL)
        )
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "idx_payments_status_created" ON payments (status, created_at)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE payments');
  }
}
