import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrderStatusHistoryAndLinkMovements1830000000000
  implements MigrationInterface
{
  name = 'CreateOrderStatusHistoryAndLinkMovements1830000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE order_status_history (
        id_order_status_history uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id uuid NOT NULL REFERENCES orders(id_order) ON DELETE RESTRICT,
        previous_status varchar(10),
        next_status varchar(10) NOT NULL,
        actor_id integer REFERENCES users(id_user) ON DELETE SET NULL,
        reason varchar(500),
        request_id varchar(100),
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_order_status_history_previous_status" CHECK (
          previous_status IS NULL OR previous_status IN (
            'PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED',
            'REJECTED', 'CANCELLED', 'EXPIRED'
          )
        ),
        CONSTRAINT "CHK_order_status_history_next_status" CHECK (next_status IN (
          'PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED',
          'REJECTED', 'CANCELLED', 'EXPIRED'
        ))
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "idx_order_status_history_order_created" ON order_status_history (order_id, created_at)',
    );
    await queryRunner.query(`
      INSERT INTO order_status_history (order_id, next_status, reason, created_at)
      SELECT id_order, status, 'Historial inicial creado por migraciÃ³n', created_at
      FROM orders
    `);
    await queryRunner.query(
      'ALTER TABLE inventory_movements ADD COLUMN order_id uuid REFERENCES orders(id_order) ON DELETE RESTRICT',
    );
    await queryRunner.query(
      'ALTER TABLE inventory_movements ADD COLUMN order_item_id uuid REFERENCES order_items(id_order_item) ON DELETE RESTRICT',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_inventory_movements_order" ON inventory_movements (order_id)',
    );
    await queryRunner.query(
      'ALTER TABLE order_items DROP CONSTRAINT "CHK_order_items_inventory_effect_status"',
    );
    await queryRunner.query(`
      ALTER TABLE order_items ADD CONSTRAINT "CHK_order_items_inventory_effect_status"
      CHECK (inventory_effect_status IN ('RESERVED', 'CONSUMED', 'RELEASED', 'WASTED', 'NOT_TRACKED'))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE order_items DROP CONSTRAINT "CHK_order_items_inventory_effect_status"',
    );
    await queryRunner.query(`
      ALTER TABLE order_items ADD CONSTRAINT "CHK_order_items_inventory_effect_status"
      CHECK (inventory_effect_status IN ('RESERVED', 'CONSUMED', 'RELEASED', 'NOT_TRACKED'))
    `);
    await queryRunner.query('ALTER TABLE inventory_movements DROP COLUMN order_item_id');
    await queryRunner.query('ALTER TABLE inventory_movements DROP COLUMN order_id');
    await queryRunner.query('DROP TABLE order_status_history');
  }
}
