import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { CatalogService } from './catalog.service';
import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';

describe('CatalogService', () => {
  let service: CatalogService;
  let categoryRepository: { findOne: jest.Mock };
  let productRepository: { count: jest.Mock; findOne: jest.Mock };

  beforeEach(async () => {
    categoryRepository = { findOne: jest.fn() };
    productRepository = { count: jest.fn(), findOne: jest.fn() };
    const productQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: getRepositoryToken(Category),
          useValue: {
            ...categoryRepository,
            createQueryBuilder: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {
            ...productRepository,
            createQueryBuilder: jest.fn().mockReturnValue(productQueryBuilder),
          },
        },
        {
          provide: DataSource,
          useValue: { transaction: jest.fn() },
        },
        {
          provide: AuditService,
          useValue: { record: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('does not delete a category that still has products', async () => {
    categoryRepository.findOne.mockResolvedValue(
      Object.assign(new Category(), {
        idCategory: 'e3b9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
        name: 'Ceviches',
      }),
    );
    productRepository.count.mockResolvedValue(1);

    await expect(
      service.removeCategory('e3b9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f', 1),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects product creation when its category does not exist', async () => {
    categoryRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createProduct(
        {
          sku: 'CEV-PESCADO',
          name: 'Ceviche de pescado',
          priceCents: 500,
          categoryId: 'e3b9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
        },
        1,
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
