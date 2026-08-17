import { Test, TestingModule } from '@nestjs/testing';
import { RolsService } from '../rols/rols.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: { createAppOrder: jest.fn(), listOwnOrders: jest.fn() },
        },
        {
          provide: RolsService,
          useValue: { findByCodeWithPermissions: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<OrdersController>(OrdersController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });
});
