import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<
    Pick<Repository<User>, 'findOne' | 'createQueryBuilder'>
  >;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
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

  it('should select the password hash only for authentication', async () => {
    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    userRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);

    await service.findByEmailForAuthentication('admin@example.com');

    expect(queryBuilder.addSelect).toHaveBeenCalledWith('user.passwordHash');
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'LOWER(user.correo) = :correo',
      { correo: 'admin@example.com' },
    );
  });
});
