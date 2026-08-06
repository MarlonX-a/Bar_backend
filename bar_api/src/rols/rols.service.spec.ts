import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Rol } from './entities/rol.entity';
import { RolsService } from './rols.service';

describe('RolsService', () => {
  let service: RolsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolsService,
        {
          provide: getRepositoryToken(Rol),
          useValue: {
            create: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            merge: jest.fn(),
            remove: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RolsService>(RolsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
