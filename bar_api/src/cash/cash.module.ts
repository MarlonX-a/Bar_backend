import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { BusinessDay } from '../operations/entities/business-day.entity';
import { Payment } from '../payments/entities/payment.entity';
import { RolsModule } from '../rols/rols.module';
import { CashController } from './cash.controller';
import { CashService } from './cash.service';
import { CashSession } from './entities/cash-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CashSession, BusinessDay, Payment]), AuditModule, RolsModule],
  controllers: [CashController],
  providers: [CashService],
})
export class CashModule {}
