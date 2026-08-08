import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Rol } from '../rols/entities/rol.entity';
import { DEFAULT_USER_ROLE_CODE } from '../rols/rol.constants';
import { RolsService } from '../rols/rols.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { AuthSessionService } from './session.service';
import { AuthSession } from './entities/auth-session.entity';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersServiceMock: jest.Mocked<
    Pick<
      UsersService,
      'findByEmail' | 'create' | 'findByEmailForAuthentication'
    >
  >;
  let rolsServiceMock: jest.Mocked<Pick<RolsService, 'findByCode'>>;
  let sessionServiceMock: jest.Mocked<
    Pick<AuthSessionService, 'create' | 'rotate' | 'revokeByRefreshToken' | 'revokeAllForUser'>
  >;
  let jwtServiceMock: { signAsync: jest.Mock };

  beforeEach(async () => {
    usersServiceMock = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findByEmailForAuthentication: jest.fn(),
      create: jest.fn().mockResolvedValue(
        Object.assign(new User(), { idUser: 1 }),
      ),
    };
    rolsServiceMock = {
      findByCode: jest.fn().mockResolvedValue(
        Object.assign(new Rol(), {
          idRol: 2,
          codigoRol: DEFAULT_USER_ROLE_CODE,
        }),
      ),
    };
    sessionServiceMock = {
      create: jest.fn(),
      rotate: jest.fn(),
      revokeByRefreshToken: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    jwtServiceMock = { signAsync: jest.fn().mockResolvedValue('access-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersServiceMock },
        { provide: RolsService, useValue: rolsServiceMock },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
        {
          provide: AuthSessionService,
          useValue: sessionServiceMock,
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
    expect(typeof createdUser.passwordHash).toBe('string');
    expect(createdUser.passwordHash).not.toBe('12345678');
    expect((createdUser.rol as Rol).codigoRol).toBe(DEFAULT_USER_ROLE_CODE);
  });

  it('should create a session and issue a short-lived access token on login', async () => {
    const user = Object.assign(new User(), {
      idUser: 7,
      correo: 'test@example.com',
      activo: true,
      passwordHash: await bcrypt.hash('password', 4),
      rol: Object.assign(new Rol(), { codigoRol: DEFAULT_USER_ROLE_CODE }),
    });
    usersServiceMock.findByEmailForAuthentication.mockResolvedValue(user);
    sessionServiceMock.create.mockResolvedValue({
      session: Object.assign(new AuthSession(), {
        idSession: 'session-id',
      }),
      refreshToken: 'refresh-token',
    });

    await expect(
      service.login({ correo: user.correo, contrasenia: 'password' }),
    ).resolves.toEqual({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      session_id: 'session-id',
    });
    expect(sessionServiceMock.create).toHaveBeenCalledWith(7, {});
    const firstCall = jwtServiceMock.signAsync.mock.calls.at(0) as unknown[] | undefined;
    const payload = firstCall?.at(0) as Record<string, unknown>;
    expect(payload.sub).toBe(7);
    expect(payload.sid).toBe('session-id');
    expect(typeof payload.jti).toBe('string');
  });

  it('should rotate refresh tokens and revoke all sessions on logout-all', async () => {
    const rotatedUser = Object.assign(new User(), {
      idUser: 7,
      correo: 'test@example.com',
      rol: Object.assign(new Rol(), { codigoRol: DEFAULT_USER_ROLE_CODE }),
    });
    sessionServiceMock.rotate.mockResolvedValue({
      session: Object.assign(new AuthSession(), {
        idSession: 'next-session',
        user: rotatedUser,
      }),
      refreshToken: 'next-refresh-token',
    });

    await expect(service.refresh('old-refresh-token')).resolves.toEqual({
      access_token: 'access-token',
      refresh_token: 'next-refresh-token',
      session_id: 'next-session',
    });
    await expect(service.logoutAll(7)).resolves.toEqual({
      message: 'Todas las sesiones fueron revocadas',
    });
    expect(sessionServiceMock.rotate).toHaveBeenCalledWith('old-refresh-token', {});
    expect(sessionServiceMock.revokeAllForUser).toHaveBeenCalledWith(7);
  });
});
