import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Product } from '../catalog/entities/product.entity';
import { IdempotencyModule } from '../common/idempotency/idempotency.module';
import { DailyInventory } from '../inventory/entities/daily-inventory.entity';
import { BusinessDay } from '../operations/entities/business-day.entity';
import { RolsModule } from '../rols/rols.module';
import { TableSession } from '../tables/entities/table-session.entity';
import { TablesModule } from '../tables/tables.module';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderStatusHistory,
      Product,
      DailyInventory,
      BusinessDay,
      TableSession,
    ]),
    TablesModule,
    RolsModule,
    IdempotencyModule,
    AuditModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
