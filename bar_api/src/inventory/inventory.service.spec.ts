import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Product } from '../catalog/entities/product.entity';
import { IdempotencyService } from '../common/idempotency/idempotency.service';
import { BusinessDay } from '../operations/entities/business-day.entity';
import { Order } from '../orders/entities/order.entity';
import { CashSession } from '../cash/entities/cash-session.entity';
import { DailyInventory } from './entities/daily-inventory.entity';
import { InventoryMovement } from './entities/inventory-movement.entity';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let businessDayRepository: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };
  let productRepository: { find: jest.Mock };
  let dailyInventoryRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let inventoryMovementRepository: { create: jest.Mock; save: jest.Mock };
  let idempotencyService: { start: jest.Mock; complete: jest.Mock };
  let orderRepository: { findOne: jest.Mock };
  let cashSessionRepository: { findOne: jest.Mock };
  let inventoryQueryBuilder: {
    setLock: jest.Mock;
    innerJoinAndSelect: jest.Mock;
    where: jest.Mock;
    getOne: jest.Mock;
  };

  beforeEach(async () => {
    businessDayRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value: unknown) => value),
      save: jest.fn().mockResolvedValue({ idBusinessDay: 'a7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f' }),
    };
    productRepository = { find: jest.fn() };
    dailyInventoryRepository = {
      create: jest.fn((value: unknown) => ({
        ...(value as object),
        idDailyInventory: 'd7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
      })),
      save: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(),
    };
    inventoryQueryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    dailyInventoryRepository.createQueryBuilder = jest
      .fn()
      .mockReturnValue(inventoryQueryBuilder);
    inventoryMovementRepository = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn(),
    };
    idempotencyService = {
      start: jest.fn().mockResolvedValue({}),
      complete: jest.fn(),
    };
    orderRepository = { findOne: jest.fn().mockResolvedValue(null) };
    cashSessionRepository = { findOne: jest.fn().mockResolvedValue(null) };
    const manager = {
      query: jest.fn(),
      getRepository: jest.fn((entity: unknown) => {
        if (entity === BusinessDay) {
          return businessDayRepository;
        }
        if (entity === Product) {
          return productRepository;
        }
        if (entity === InventoryMovement) {
          return inventoryMovementRepository;
        }
        if (entity === Order) {
          return orderRepository;
        }
        if (entity === CashSession) {
          return cashSessionRepository;
        }
        return dailyInventoryRepository;
      }),
    };
    const transaction = jest.fn(
      async (callback: (transactionManager: typeof manager) => Promise<unknown>) =>
        callback(manager),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getRepositoryToken(BusinessDay),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(DailyInventory),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(Product),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(InventoryMovement),
          useValue: { find: jest.fn(), createQueryBuilder: jest.fn() },
        },
        { provide: getRepositoryToken(Order), useValue: orderRepository },
        { provide: getRepositoryToken(CashSession), useValue: cashSessionRepository },
        {
          provide: DataSource,
          useValue: { transaction },
        },
        { provide: AuditService, useValue: { record: jest.fn() } },
        {
          provide: IdempotencyService,
          useValue: idempotencyService,
        },
      ],
    }).compile();
    service = module.get<InventoryService>(InventoryService);
  });

  it('creates daily inventory only when every tracked product is declared', async () => {
    const firstProduct = 'a7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f';
    const secondProduct = 'b7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f';
    productRepository.find.mockResolvedValue([
      { idProduct: firstProduct },
      { idProduct: secondProduct },
    ]);

    await service.openBusinessDay(
      {
        inventories: [
          { productId: firstProduct, quantity: 20 },
          { productId: secondProduct, quantity: 0 },
        ],
      },
      1,
    );

    expect(dailyInventoryRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ productId: firstProduct, onHandQuantity: 20 }),
      expect.objectContaining({ productId: secondProduct, onHandQuantity: 0 }),
    ]);
    expect(inventoryMovementRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ quantityDelta: 20, balanceBefore: 0 }),
    ]);
  });

  it('rejects a partial opening inventory declaration', async () => {
    productRepository.find.mockResolvedValue([
      { idProduct: 'a7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f' },
      { idProduct: 'b7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f' },
    ]);

    await expect(
      service.openBusinessDay(
        { inventories: [{ productId: 'a7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f', quantity: 20 }] },
        1,
      ),
    ).rejects.toThrow(ConflictException);
    expect(businessDayRepository.save).not.toHaveBeenCalled();
  });

  it('does not allow a negative adjustment to consume reserved stock', async () => {
    inventoryQueryBuilder.getOne.mockResolvedValue({
      idDailyInventory: 'd7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
      onHandQuantity: 3,
      reservedQuantity: 3,
    });

    await expect(
      service.adjust(
        {
          productId: 'a7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
          quantityDelta: -1,
          observation: 'Diferencia detectada',
        },
        1,
        'adjustment-001',
      ),
    ).rejects.toThrow(ConflictException);
    expect(idempotencyService.complete).not.toHaveBeenCalled();
  });

  it('closes a business day only when there are no active orders, reservations or open cash session', async () => {
    const businessDay = {
      idBusinessDay: 'a7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
      status: 'OPEN',
    };
    businessDayRepository.findOne.mockResolvedValue(businessDay);
    businessDayRepository.save.mockResolvedValue(businessDay);

    const closed = await service.closeBusinessDay(7, 'request-close-001');

    expect(closed.status).toBe('CLOSED');
    expect(closed.closedById).toBe(7);
    expect(closed.closedAt).toBeInstanceOf(Date);
  });

  it('rejects closing a business day while an order remains active', async () => {
    businessDayRepository.findOne.mockResolvedValue({
      idBusinessDay: 'a7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
      status: 'OPEN',
    });
    orderRepository.findOne.mockResolvedValue({ idOrder: 'pending-order' });

    await expect(service.closeBusinessDay(7)).rejects.toThrow(ConflictException);
  });
});
