import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyInventory } from '../inventory/entities/daily-inventory.entity';
import { InventoryMovement } from '../inventory/entities/inventory-movement.entity';
import { BusinessDay } from '../operations/entities/business-day.entity';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { RolsModule } from '../rols/rols.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BusinessDay, Order, Payment, InventoryMovement, DailyInventory]),
    RolsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
