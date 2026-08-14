import { Test, TestingModule } from '@nestjs/testing';
import { RolsService } from '../rols/rols.service';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';

describe('TablesController', () => {
  let controller: TablesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TablesController],
      providers: [
        {
          provide: TablesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            rotateQr: jest.fn(),
            exchangeQrToken: jest.fn(),
          },
        },
        {
          provide: RolsService,
          useValue: { findByCodeWithPermissions: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<TablesController>(TablesController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });
});
