import { Test, TestingModule } from '@nestjs/testing';
import { RolsService } from '../rols/rols.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            create: jest.fn(),
            findByOrder: jest.fn(),
            verify: jest.fn(),
            reject: jest.fn(),
            void: jest.fn(),
          },
        },
        {
          provide: RolsService,
          useValue: { findByCodeWithPermissions: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });
});
