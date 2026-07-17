import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ idUser: 1 }),
          },
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
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should assign role id 1 when registering a new user', async () => {
    await service.register({
      correo: 'test@example.com',
      contrasenia: '12345678',
    } as RegisterDto);

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        correo: 'test@example.com',
        contrasenia: expect.any(String),
        rol: { idRol: 1 },
      }),
    );
  });
});
