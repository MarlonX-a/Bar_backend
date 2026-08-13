import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCatalog1780000000000 implements MigrationInterface {
  name = 'CreateCatalog1780000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(`
      CREATE TABLE categories (
        id_category uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar(100) NOT NULL,
        description varchar(255),
        display_order integer NOT NULL DEFAULT 0,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_categories_display_order_non_negative" CHECK (display_order >= 0)
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_categories_name_normalized" ON categories (lower(name))',
    );
    await queryRunner.query(`
      CREATE TABLE products (
        id_product uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sku varchar(64) NOT NULL UNIQUE,
        name varchar(150) NOT NULL,
        description varchar(1000),
        price_cents integer NOT NULL,
        image_url varchar(2048),
        category_id uuid NOT NULL REFERENCES categories(id_category) ON DELETE RESTRICT,
        active boolean NOT NULL DEFAULT true,
        visible_in_menu boolean NOT NULL DEFAULT true,
        track_inventory boolean NOT NULL DEFAULT true,
        display_order integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_products_price_cents_non_negative" CHECK (price_cents >= 0),
        CONSTRAINT "CHK_products_display_order_non_negative" CHECK (display_order >= 0)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "idx_products_category_visible" ON products (category_id, active, visible_in_menu)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE products');
    await queryRunner.query('DROP TABLE categories');
  }
}
