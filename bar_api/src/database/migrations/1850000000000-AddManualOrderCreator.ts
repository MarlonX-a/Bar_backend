import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddManualOrderCreator1850000000000 implements MigrationInterface {
  name = 'AddManualOrderCreator1850000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD "created_by_id" integer`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id_user") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orders_created_by_created" ON "orders" ("created_by_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_orders_created_by_created"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_created_by"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "created_by_id"`);
  }
}
