import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Product } from '../catalog/entities/product.entity';
import { BusinessDay } from '../operations/entities/business-day.entity';
import { RolsModule } from '../rols/rols.module';
import { DailyInventory } from './entities/daily-inventory.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BusinessDay, DailyInventory, Product]),
    AuditModule,
    RolsModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
