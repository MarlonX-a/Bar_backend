import { Test, TestingModule } from '@nestjs/testing';
import { RolsController } from './rols.controller';
import { RolsService } from './rols.service';

describe('RolsController', () => {
  let controller: RolsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolsController],
      providers: [RolsService],
    }).compile();

    controller = module.get<RolsController>(RolsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
