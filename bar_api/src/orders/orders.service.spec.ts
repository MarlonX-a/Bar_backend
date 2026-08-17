import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Product } from '../catalog/entities/product.entity';
import { IdempotencyService } from '../common/idempotency/idempotency.service';
import { DailyInventory } from '../inventory/entities/daily-inventory.entity';
import { InventoryMovement } from '../inventory/entities/inventory-movement.entity';
import { BusinessDay } from '../operations/entities/business-day.entity';
import { TableSession } from '../tables/entities/table-session.entity';
import { TablesService } from '../tables/tables.service';
import { OrderItem } from './entities/order-item.entity';
import { InventoryEffectStatus } from './entities/order-item.entity';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let dailyInventory: {
    idDailyInventory: string;
    productId: string;
    businessDayId: string;
    onHandQuantity: number;
    reservedQuantity: number;
  };
  let orderRepository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock };
  let inventoryMovementRepository: { create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    dailyInventory = {
      idDailyInventory: 'd7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
      productId: 'a7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
      businessDayId: 'b7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
      onHandQuantity: 5,
      reservedQuantity: 1,
    };
    orderRepository = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn().mockResolvedValue({
        idOrder: 'c7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
      }),
      findOne: jest.fn(),
    };
    const productQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          idProduct: dailyInventory.productId,
          name: 'Ceviche de pescado',
          priceCents: 500,
          trackInventory: true,
        },
      ]),
    };
    const inventoryQueryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([dailyInventory]),
    };
    const orderItemRepository = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn((items: unknown) => Promise.resolve(items)),
    };
    inventoryMovementRepository = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn(),
    };
    const statusHistoryRepository = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn(),
    };
    const dailyInventoryRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(inventoryQueryBuilder),
      save: jest.fn(),
    };
    const tableSessionRepository = {
      findOne: jest.fn().mockResolvedValue({
        idTableSession: 'e7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
        tableId: 'f7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
        expiresAt: new Date(Date.now() + 60_000),
        table: { active: true },
      }),
    };
    const businessDayRepository = {
      findOne: jest.fn().mockResolvedValue({
        idBusinessDay: dailyInventory.businessDayId,
      }),
    };
    const manager = {
      query: jest.fn(),
      getRepository: jest.fn((entity: unknown) => {
        if (entity === TableSession) {
          return tableSessionRepository;
        }
        if (entity === BusinessDay) {
          return businessDayRepository;
        }
        if (entity === Product) {
          return { createQueryBuilder: jest.fn().mockReturnValue(productQueryBuilder) };
        }
        if (entity === DailyInventory) {
          return dailyInventoryRepository;
        }
        if (entity === Order) {
          return orderRepository;
        }
        if (entity === InventoryMovement) {
          return inventoryMovementRepository;
        }
        if (entity === OrderStatusHistory) {
          return statusHistoryRepository;
        }
        return orderItemRepository;
      }),
    };
    const transaction = jest.fn(
      async (callback: (transactionManager: typeof manager) => Promise<unknown>) =>
        callback(manager),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(OrderItem), useValue: {} },
        { provide: getRepositoryToken(Product), useValue: {} },
        { provide: getRepositoryToken(DailyInventory), useValue: {} },
        { provide: getRepositoryToken(InventoryMovement), useValue: {} },
        { provide: getRepositoryToken(TableSession), useValue: {} },
        { provide: getRepositoryToken(OrderStatusHistory), useValue: {} },
        { provide: DataSource, useValue: { transaction } },
        {
          provide: TablesService,
          useValue: {
            resolveActiveSession: jest.fn().mockResolvedValue({
              idTableSession: 'e7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
            }),
          },
        },
        {
          provide: IdempotencyService,
          useValue: { start: jest.fn().mockResolvedValue({}), complete: jest.fn() },
        },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();
    service = module.get<OrdersService>(OrdersService);
  });

  it('uses the catalog price and reserves the requested quantity', async () => {
    const order = await service.createAppOrder(
      {
        items: [
          {
            productId: dailyInventory.productId,
            quantity: 2,
            observation: 'Sin cebolla',
          },
        ],
      },
      'table-session-token',
      'app-order-001',
    );

    expect(orderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ totalCents: 1000 }),
    );
    expect(order.items[0]).toEqual(
      expect.objectContaining({ unitPriceCents: 500, subtotalCents: 1000 }),
    );
    expect(dailyInventory.reservedQuantity).toBe(3);
  });

  it('rejects orders that exceed available inventory', async () => {
    dailyInventory.onHandQuantity = 2;
    dailyInventory.reservedQuantity = 1;

    await expect(
      service.createAppOrder(
        { items: [{ productId: dailyInventory.productId, quantity: 2 }] },
        'table-session-token',
        'app-order-002',
      ),
    ).rejects.toThrow(ConflictException);
    expect(orderRepository.save).not.toHaveBeenCalled();
  });

  it('consumes the reservation and writes an APP_SALE movement on delivery', async () => {
    dailyInventory.onHandQuantity = 5;
    dailyInventory.reservedQuantity = 2;
    const item = {
      idOrderItem: 'f7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
      productId: dailyInventory.productId,
      quantity: 2,
      inventoryEffectStatus: InventoryEffectStatus.RESERVED,
    };
    const order = {
      idOrder: 'c7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
      businessDayId: dailyInventory.businessDayId,
      status: OrderStatus.READY,
      items: [item],
    };
    orderRepository.findOne.mockResolvedValue(order);
    orderRepository.save.mockResolvedValue(order);

    await service.transition(
      order.idOrder,
      { targetStatus: OrderStatus.DELIVERED },
      7,
    );

    expect(dailyInventory.onHandQuantity).toBe(3);
    expect(dailyInventory.reservedQuantity).toBe(0);
    expect(item.inventoryEffectStatus).toBe(InventoryEffectStatus.CONSUMED);
    expect(inventoryMovementRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ movementType: 'APP_SALE', quantityDelta: -2 }),
    ]);
  });

  it('records waste when an in-progress order is cancelled exceptionally', async () => {
    dailyInventory.onHandQuantity = 5;
    dailyInventory.reservedQuantity = 2;
    const item = {
      idOrderItem: 'f7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
      productId: dailyInventory.productId,
      quantity: 2,
      inventoryEffectStatus: InventoryEffectStatus.RESERVED,
    };
    const order = {
      idOrder: 'c7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
      businessDayId: dailyInventory.businessDayId,
      status: OrderStatus.PREPARING,
      items: [item],
    };
    orderRepository.findOne.mockResolvedValue(order);
    orderRepository.save.mockResolvedValue(order);

    await service.cancelException(
      order.idOrder,
      { resolution: 'WASTE', reason: 'PreparaciÃ³n no apta' },
      7,
    );

    expect(dailyInventory.onHandQuantity).toBe(3);
    expect(dailyInventory.reservedQuantity).toBe(0);
    expect(item.inventoryEffectStatus).toBe(InventoryEffectStatus.WASTED);
    expect(inventoryMovementRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ movementType: 'WASTE', quantityDelta: -2 }),
    ]);
  });
});
