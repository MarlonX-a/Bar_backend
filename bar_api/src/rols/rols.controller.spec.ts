import { Test, TestingModule } from '@nestjs/testing';
import { RolsController } from './rols.controller';
import { RolsService } from './rols.service';

describe('RolsController', () => {
  let controller: RolsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolsController],
      providers: [
        {
          provide: RolsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RolsController>(RolsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
