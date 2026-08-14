import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBusinessDaysAndDailyInventory1800000000000
  implements MigrationInterface
{
  name = 'CreateBusinessDaysAndDailyInventory1800000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE business_days (
        id_business_day uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        business_date date NOT NULL UNIQUE,
        status varchar(10) NOT NULL DEFAULT 'OPEN',
        opened_by_id integer NOT NULL REFERENCES users(id_user) ON DELETE RESTRICT,
        opened_at timestamptz NOT NULL,
        closed_by_id integer REFERENCES users(id_user) ON DELETE RESTRICT,
        closed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_business_days_status" CHECK (status IN ('OPEN', 'CLOSED')),
        CONSTRAINT "CHK_business_days_closed_fields" CHECK (
          (status = 'OPEN' AND closed_by_id IS NULL AND closed_at IS NULL) OR
          (status = 'CLOSED' AND closed_by_id IS NOT NULL AND closed_at IS NOT NULL)
        )
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_business_days_only_one_open" ON business_days (status) WHERE status = 'OPEN'`,
    );
    await queryRunner.query(`
      CREATE TABLE daily_inventories (
        id_daily_inventory uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        business_day_id uuid NOT NULL REFERENCES business_days(id_business_day) ON DELETE RESTRICT,
        product_id uuid NOT NULL REFERENCES products(id_product) ON DELETE RESTRICT,
        initial_quantity integer NOT NULL,
        on_hand_quantity integer NOT NULL,
        reserved_quantity integer NOT NULL DEFAULT 0,
        version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_daily_inventories_business_day_product" UNIQUE (business_day_id, product_id),
        CONSTRAINT "CHK_daily_inventories_initial_quantity" CHECK (initial_quantity >= 0),
        CONSTRAINT "CHK_daily_inventories_on_hand_quantity" CHECK (on_hand_quantity >= 0),
        CONSTRAINT "CHK_daily_inventories_reserved_quantity" CHECK (reserved_quantity >= 0),
        CONSTRAINT "CHK_daily_inventories_reserved_not_above_on_hand" CHECK (reserved_quantity <= on_hand_quantity)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "idx_daily_inventories_product" ON daily_inventories (product_id)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE daily_inventories');
    await queryRunner.query('DROP TABLE business_days');
  }
}
