import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Product } from '../catalog/entities/product.entity';
import { BusinessDay } from '../operations/entities/business-day.entity';
import { DailyInventory } from './entities/daily-inventory.entity';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let businessDayRepository: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };
  let productRepository: { find: jest.Mock };
  let dailyInventoryRepository: { create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    businessDayRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value: unknown) => value),
      save: jest.fn().mockResolvedValue({ idBusinessDay: 'a7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f' }),
    };
    productRepository = { find: jest.fn() };
    dailyInventoryRepository = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn(),
    };
    const manager = {
      query: jest.fn(),
      getRepository: jest.fn((entity: unknown) => {
        if (entity === BusinessDay) {
          return businessDayRepository;
        }
        if (entity === Product) {
          return productRepository;
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
          provide: DataSource,
          useValue: { transaction },
        },
        { provide: AuditService, useValue: { record: jest.fn() } },
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
});
