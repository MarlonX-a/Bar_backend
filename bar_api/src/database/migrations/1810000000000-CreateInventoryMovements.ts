import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoryMovements1810000000000
  implements MigrationInterface
{
  name = 'CreateInventoryMovements1810000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE inventory_movements (
        id_inventory_movement uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        daily_inventory_id uuid NOT NULL REFERENCES daily_inventories(id_daily_inventory) ON DELETE RESTRICT,
        movement_type varchar(32) NOT NULL,
        quantity_delta integer NOT NULL,
        balance_before integer NOT NULL,
        balance_after integer NOT NULL,
        actor_id integer NOT NULL REFERENCES users(id_user) ON DELETE RESTRICT,
        observation varchar(500) NOT NULL,
        request_id varchar(100),
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_inventory_movements_type" CHECK (movement_type IN (
          'OPENING_STOCK', 'RESTOCK', 'APP_SALE', 'MANUAL_SALE', 'GIFT',
          'OWNER_CONSUMPTION', 'STAFF_CONSUMPTION', 'WASTE',
          'POSITIVE_ADJUSTMENT', 'NEGATIVE_ADJUSTMENT', 'SALE_REVERSAL'
        )),
        CONSTRAINT "CHK_inventory_movements_non_zero_delta" CHECK (quantity_delta <> 0),
        CONSTRAINT "CHK_inventory_movements_balances_non_negative" CHECK (balance_before >= 0 AND balance_after >= 0)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "idx_inventory_movements_inventory_created" ON inventory_movements (daily_inventory_id, created_at)',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_inventory_movements_type_created" ON inventory_movements (movement_type, created_at)',
    );
    await queryRunner.query(`
      INSERT INTO inventory_movements (
        daily_inventory_id, movement_type, quantity_delta, balance_before,
        balance_after, actor_id, observation, created_at
      )
      SELECT inventory.id_daily_inventory, 'OPENING_STOCK', inventory.initial_quantity,
        0, inventory.initial_quantity, day.opened_by_id,
        'Inventario inicial de jornada', inventory.created_at
      FROM daily_inventories inventory
      INNER JOIN business_days day ON day.id_business_day = inventory.business_day_id
      WHERE inventory.initial_quantity > 0
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE inventory_movements');
  }
}
