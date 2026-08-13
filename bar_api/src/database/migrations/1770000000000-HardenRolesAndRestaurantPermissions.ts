import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenRolesAndRestaurantPermissions1770000000000
  implements MigrationInterface
{
  name = 'HardenRolesAndRestaurantPermissions1770000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const duplicateNames = (await queryRunner.query(
      `SELECT lower(nombre_rol) FROM rols GROUP BY lower(nombre_rol) HAVING count(*) > 1`,
    )) as unknown[];
    if (duplicateNames.length > 0) {
      throw new Error('Cannot normalize role names while case-insensitive duplicates exist');
    }
    await queryRunner.query(`UPDATE rols SET nombre_rol = trim(nombre_rol)`);
    await queryRunner.query(`ALTER TABLE rols ADD COLUMN is_system boolean NOT NULL DEFAULT false`);
    await queryRunner.query(
      `UPDATE rols SET is_system = true WHERE codigo_rol IN ('ADMIN', 'WORKER', 'CUSTOMER')`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_rols_nombre_normalized" ON rols (lower(nombre_rol))`,
    );
    await queryRunner.query(`
      INSERT INTO permissions (codigo_permiso, nombre_permiso, descripcion_permiso) VALUES
      ('CATEGORY_MANAGE', 'Gestionar categorías', 'Crear y administrar categorías'),
      ('PRODUCT_READ', 'Consultar productos', 'Consultar catálogo operativo'),
      ('PRODUCT_MANAGE', 'Gestionar productos', 'Crear y administrar productos'),
      ('TABLE_READ', 'Consultar mesas', 'Consultar mesas y sus estados'),
      ('TABLE_MANAGE', 'Gestionar mesas', 'Crear y administrar mesas'),
      ('TABLE_QR_ROTATE', 'Rotar QR de mesas', 'Rotar tokens QR de mesas'),
      ('BUSINESS_DAY_OPEN', 'Abrir jornada', 'Abrir la jornada operativa'),
      ('BUSINESS_DAY_CLOSE', 'Cerrar jornada', 'Cerrar la jornada operativa'),
      ('INVENTORY_READ', 'Consultar inventario', 'Consultar inventario operativo'),
      ('INVENTORY_OPEN', 'Inicializar inventario', 'Registrar inventario inicial'),
      ('INVENTORY_RESTOCK', 'Reponer inventario', 'Registrar reposiciones'),
      ('INVENTORY_GIFT', 'Registrar regalías', 'Registrar productos regalados'),
      ('INVENTORY_CONSUMPTION', 'Registrar consumo', 'Registrar consumo personal'),
      ('INVENTORY_WASTE', 'Registrar desperdicio', 'Registrar desperdicios'),
      ('INVENTORY_ADJUST', 'Ajustar inventario', 'Registrar ajustes de inventario'),
      ('ORDER_CREATE_MANUAL', 'Crear pedido manual', 'Registrar pedidos manuales'),
      ('ORDER_READ_OPERATIONAL', 'Consultar pedidos operativos', 'Consultar pedidos de operación'),
      ('ORDER_TRANSITION', 'Cambiar estado de pedido', 'Aceptar, preparar, listar y entregar pedidos'),
      ('ORDER_CANCEL_EXCEPTION', 'Cancelar pedido excepcional', 'Cancelar pedidos preparados con resolución'),
      ('PAYMENT_VERIFY', 'Verificar pagos', 'Verificar pagos manuales'),
      ('CASH_OPEN', 'Abrir caja', 'Abrir caja diaria'),
      ('CASH_CLOSE', 'Cerrar caja', 'Cerrar caja diaria'),
      ('CASH_READ', 'Consultar caja', 'Consultar estado y resúmenes de caja'),
      ('REPORT_READ', 'Consultar reportes', 'Consultar reportes operativos'),
      ('AUDIT_READ', 'Consultar auditoría', 'Consultar eventos de auditoría')
      ON CONFLICT (codigo_permiso) DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id_rol, p.id_permission FROM rols r CROSS JOIN permissions p
      WHERE r.codigo_rol = 'ADMIN'
      ON CONFLICT DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id_rol, p.id_permission FROM rols r JOIN permissions p
        ON p.codigo_permiso IN (
          'PROFILE_READ_SELF', 'PROFILE_WRITE_SELF', 'PRODUCT_READ', 'TABLE_READ',
          'INVENTORY_READ', 'INVENTORY_RESTOCK', 'INVENTORY_GIFT',
          'INVENTORY_CONSUMPTION', 'INVENTORY_WASTE', 'ORDER_CREATE_MANUAL',
          'ORDER_READ_OPERATIONAL', 'ORDER_TRANSITION', 'PAYMENT_VERIFY', 'CASH_READ'
        )
      WHERE r.codigo_rol = 'WORKER'
      ON CONFLICT DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM permissions WHERE codigo_permiso IN (
      'CATEGORY_MANAGE', 'PRODUCT_READ', 'PRODUCT_MANAGE', 'TABLE_READ', 'TABLE_MANAGE',
      'TABLE_QR_ROTATE', 'BUSINESS_DAY_OPEN', 'BUSINESS_DAY_CLOSE', 'INVENTORY_READ',
      'INVENTORY_OPEN', 'INVENTORY_RESTOCK', 'INVENTORY_GIFT', 'INVENTORY_CONSUMPTION',
      'INVENTORY_WASTE', 'INVENTORY_ADJUST', 'ORDER_CREATE_MANUAL', 'ORDER_READ_OPERATIONAL',
      'ORDER_TRANSITION', 'ORDER_CANCEL_EXCEPTION', 'PAYMENT_VERIFY', 'CASH_OPEN',
      'CASH_CLOSE', 'CASH_READ', 'REPORT_READ', 'AUDIT_READ'
    )`);
    await queryRunner.query(`DROP INDEX "UQ_rols_nombre_normalized"`);
    await queryRunner.query(`ALTER TABLE rols DROP COLUMN is_system`);
  }
}
