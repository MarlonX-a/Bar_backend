import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { RestaurantTable } from './entities/restaurant-table.entity';
import { TableSession } from './entities/table-session.entity';
import { TablesService } from './tables.service';

describe('TablesService', () => {
  let service: TablesService;
  let tableRepository: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    tableRepository = { createQueryBuilder: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TablesService,
        {
          provide: getRepositoryToken(RestaurantTable),
          useValue: { ...tableRepository, find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(TableSession),
          useValue: { create: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn() },
        },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        { provide: AuditService, useValue: { record: jest.fn() } },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue(240) },
        },
      ],
    }).compile();
    service = module.get<TablesService>(TablesService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects an unknown QR token', async () => {
    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    tableRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(service.exchangeQrToken('a'.repeat(43))).rejects.toThrow(
      'El cÃ³digo QR no es vÃ¡lido o ya no estÃ¡ activo',
    );
  });
});
