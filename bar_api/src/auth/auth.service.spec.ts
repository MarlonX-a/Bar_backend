import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Rol } from '../rols/entities/rol.entity';
import { DEFAULT_USER_ROLE_ID } from '../rols/rol.constants';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersServiceMock: jest.Mocked<
    Pick<UsersService, 'findByEmail' | 'create'>
  >;

  beforeEach(async () => {
    usersServiceMock = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(Object.assign(new User(), {
        idUser: 1,
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should await persistence and assign the default user role', async () => {
    await service.register({
      correo: 'test@example.com',
      contrasenia: '12345678',
    });

    expect(usersServiceMock.create).toHaveBeenCalledTimes(1);
    const [createdUser] = usersServiceMock.create.mock.calls[0];

    expect(createdUser.correo).toBe('test@example.com');
    expect(typeof createdUser.contrasenia).toBe('string');
    expect(createdUser.contrasenia).not.toBe('12345678');
    expect((createdUser.rol as Rol).idRol).toBe(DEFAULT_USER_ROLE_ID);
  });
});
