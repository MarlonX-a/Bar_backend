import { Test, TestingModule } from '@nestjs/testing';
import { RolsService } from '../rols/rols.service';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

describe('InventoryController', () => {
  let controller: InventoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: {
            openBusinessDay: jest.fn(),
            getOpenBusinessDay: jest.fn(),
            getOpenBusinessDayInventory: jest.fn(),
          },
        },
        {
          provide: RolsService,
          useValue: { findByCodeWithPermissions: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<InventoryController>(InventoryController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });
});
