import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { IdempotencyModule } from '../common/idempotency/idempotency.module';
import { Product } from '../catalog/entities/product.entity';
import { BusinessDay } from '../operations/entities/business-day.entity';
import { Order } from '../orders/entities/order.entity';
import { CashSession } from '../cash/entities/cash-session.entity';
import { RolsModule } from '../rols/rols.module';
import { DailyInventory } from './entities/daily-inventory.entity';
import { InventoryMovement } from './entities/inventory-movement.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BusinessDay,
      DailyInventory,
      Product,
      InventoryMovement,
      Order,
      CashSession,
    ]),
    AuditModule,
    IdempotencyModule,
    RolsModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
