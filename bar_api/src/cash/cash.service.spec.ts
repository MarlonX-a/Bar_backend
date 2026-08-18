import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { BusinessDay, BusinessDayStatus } from '../operations/entities/business-day.entity';
import { CashService } from './cash.service';
import { CashSession, CashSessionStatus } from './entities/cash-session.entity';

describe('CashService', () => {
  let service: CashService;
  let cashRepository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock };

  beforeEach(async () => {
    cashRepository = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn((value: unknown) => Promise.resolve({ idCashSession: 'a7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f', ...(value as object) })),
      findOne: jest.fn().mockResolvedValue(null),
    };
    const businessDayRepository = {
      findOne: jest.fn().mockResolvedValue({
        idBusinessDay: 'b7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f', status: BusinessDayStatus.OPEN,
      }),
    };
    const paymentQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ expectedCents: '1250' }),
    };
    const paymentRepository = { createQueryBuilder: jest.fn().mockReturnValue(paymentQueryBuilder) };
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === CashSession) return cashRepository;
        if (entity === BusinessDay) return businessDayRepository;
        return paymentRepository;
      }),
    };
    const transaction = jest.fn(async (callback: (transactionManager: typeof manager) => Promise<unknown>) => callback(manager));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashService,
        { provide: getRepositoryToken(CashSession), useValue: cashRepository },
        { provide: getRepositoryToken(BusinessDay), useValue: businessDayRepository },
        { provide: DataSource, useValue: { transaction, manager } },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();
    service = module.get<CashService>(CashService);
  });

  it('opens only one cash session for the open business day', async () => {
    const cashSession = await service.open({ openingCents: 500 }, 7);
    expect(cashSession).toEqual(expect.objectContaining({ status: CashSessionStatus.OPEN, openingCents: 500, openedById: 7 }));

    cashRepository.findOne.mockResolvedValue(cashSession);
    await expect(service.open({ openingCents: 500 }, 7)).rejects.toThrow(ConflictException);
  });

  it('closes with expected cash based only on verified cash payments', async () => {
    cashRepository.findOne.mockResolvedValue({
      idCashSession: 'a7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f', status: CashSessionStatus.OPEN, openingCents: 500,
    });
    const closed = await service.close({ declaredCents: 1200 }, 8);
    expect(closed).toEqual(expect.objectContaining({
      status: CashSessionStatus.CLOSED, expectedCents: 1750, declaredCents: 1200, differenceCents: -550, closedById: 8,
    }));
  });
});
