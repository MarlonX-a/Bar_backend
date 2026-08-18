import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InventoryMovement } from '../inventory/entities/inventory-movement.entity';
import { BusinessDay, BusinessDayStatus } from '../operations/entities/business-day.entity';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  it('derives sales, payment methods and inventory totals from source records', async () => {
    const businessDayRepository = {
      findOne: jest.fn().mockResolvedValue({ idBusinessDay: 'a7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f', businessDate: '2026-08-17', status: BusinessDayStatus.OPEN }),
    };
    const salesQuery = {
      select: jest.fn().mockReturnThis(), addSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(), getRawOne: jest.fn().mockResolvedValue({ deliveredOrderCount: '3', totalCents: '2700', appCents: '1500', manualCents: '1200' }),
    };
    const paymentsQuery = {
      innerJoin: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ method: 'CASH', amountCents: '1700' }, { method: 'TRANSFER', amountCents: '1000' }]),
    };
    const movementsQuery = {
      innerJoin: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(), groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ movementType: 'WASTE', quantityDelta: '-2' }]),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(BusinessDay), useValue: businessDayRepository },
        { provide: getRepositoryToken(Order), useValue: { createQueryBuilder: jest.fn().mockReturnValue(salesQuery) } },
        { provide: getRepositoryToken(Payment), useValue: { createQueryBuilder: jest.fn().mockReturnValue(paymentsQuery) } },
        { provide: getRepositoryToken(InventoryMovement), useValue: { createQueryBuilder: jest.fn().mockReturnValue(movementsQuery) } },
      ],
    }).compile();

    const report = await module.get<ReportsService>(ReportsService).getCurrentBusinessReport();

    expect(report.sales).toEqual({ deliveredOrderCount: 3, totalCents: 2700, appCents: 1500, manualCents: 1200 });
    expect(report.verifiedPayments).toEqual([{ method: 'CASH', amountCents: 1700 }, { method: 'TRANSFER', amountCents: 1000 }]);
    expect(report.inventoryMovements).toEqual([{ movementType: 'WASTE', quantityDelta: -2 }]);
  });
});
