import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Pick<Repository<User>, 'findOne'>>;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should load the role relation when finding a user by email', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await service.findByEmail('admin@example.com');

    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { correo: 'admin@example.com' },
      relations: { rol: true },
    });
  });
});
