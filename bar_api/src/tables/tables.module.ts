import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { RolsModule } from '../rols/rols.module';
import { RestaurantTable } from './entities/restaurant-table.entity';
import { TableSession } from './entities/table-session.entity';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RestaurantTable, TableSession]),
    AuditModule,
    RolsModule,
  ],
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}
