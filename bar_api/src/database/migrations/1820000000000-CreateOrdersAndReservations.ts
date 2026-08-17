import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrdersAndReservations1820000000000
  implements MigrationInterface
{
  name = 'CreateOrdersAndReservations1820000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE orders (
        id_order uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        business_day_id uuid NOT NULL REFERENCES business_days(id_business_day) ON DELETE RESTRICT,
        user_id integer REFERENCES users(id_user) ON DELETE SET NULL,
        table_id uuid REFERENCES restaurant_tables(id_table) ON DELETE RESTRICT,
        table_session_id uuid REFERENCES table_sessions(id_table_session) ON DELETE RESTRICT,
        origin varchar(10) NOT NULL,
        status varchar(10) NOT NULL DEFAULT 'PENDING',
        total_cents integer NOT NULL,
        currency varchar(3) NOT NULL DEFAULT 'USD',
        idempotency_key varchar(128),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_orders_origin" CHECK (origin IN ('APP', 'MANUAL')),
        CONSTRAINT "CHK_orders_status" CHECK (status IN (
          'PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED',
          'REJECTED', 'CANCELLED', 'EXPIRED'
        )),
        CONSTRAINT "CHK_orders_total_cents_non_negative" CHECK (total_cents >= 0),
        CONSTRAINT "CHK_orders_currency" CHECK (currency = 'USD'),
        CONSTRAINT "CHK_orders_app_table_session" CHECK (
          origin = 'MANUAL' OR (table_id IS NOT NULL AND table_session_id IS NOT NULL)
        )
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "idx_orders_business_day_status" ON orders (business_day_id, status)',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_orders_table_session_created" ON orders (table_session_id, created_at)',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_orders_table_session_idempotency" ON orders (table_session_id, idempotency_key) WHERE table_session_id IS NOT NULL AND idempotency_key IS NOT NULL',
    );
    await queryRunner.query(`
      CREATE TABLE order_items (
        id_order_item uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id uuid NOT NULL REFERENCES orders(id_order) ON DELETE RESTRICT,
        product_id uuid NOT NULL REFERENCES products(id_product) ON DELETE RESTRICT,
        product_name_snapshot varchar(150) NOT NULL,
        unit_price_cents integer NOT NULL,
        quantity integer NOT NULL,
        subtotal_cents integer NOT NULL,
        observation varchar(500),
        inventory_effect_status varchar(12) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_order_items_quantity_positive" CHECK (quantity > 0),
        CONSTRAINT "CHK_order_items_unit_price_non_negative" CHECK (unit_price_cents >= 0),
        CONSTRAINT "CHK_order_items_subtotal_non_negative" CHECK (subtotal_cents >= 0),
        CONSTRAINT "CHK_order_items_inventory_effect_status" CHECK (inventory_effect_status IN ('RESERVED', 'CONSUMED', 'RELEASED', 'NOT_TRACKED'))
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "idx_order_items_order" ON order_items (order_id)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE order_items');
    await queryRunner.query('DROP TABLE orders');
  }
}
