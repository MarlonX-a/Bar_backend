import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Perfil } from './entities/perfil.entity';
import { PerfilService } from './perfil.service';
import { User } from '../users/entities/user.entity';

describe('PerfilService', () => {
  let service: PerfilService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerfilService,
        {
          provide: getRepositoryToken(Perfil),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn().mockResolvedValue(
              Object.assign(new User(), { idUser: 1 }),
            ),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PerfilService>(PerfilService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
