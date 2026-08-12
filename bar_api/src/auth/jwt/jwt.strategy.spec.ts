import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Rol } from '../../rols/entities/rol.entity';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { JwtStrategy } from './jwt.strategy';
import { AuthSessionService } from '../session.service';

describe('JwtStrategy', () => {
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('test-secret'),
  } as unknown as ConfigService;

  const usersService: jest.Mocked<Pick<UsersService, 'findById'>> = {
    findById: jest.fn(),
  };
  const authSessionService: jest.Mocked<Pick<AuthSessionService, 'isActive'>> = {
    isActive: jest.fn().mockResolvedValue(true),
  };

  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(
      configService,
      usersService as unknown as UsersService,
      authSessionService as unknown as AuthSessionService,
    );
  });

  it('should expose the current database role in req.user', async () => {
    const role = Object.assign(new Rol(), { idRol: 4, codigoRol: 'ADMIN' });
    usersService.findById.mockResolvedValue(
      Object.assign(new User(), {
        idUser: 2,
        correo: 'admin@example.com',
        activo: true,
        rol: role,
      }),
    );

    await expect(
      strategy.validate({
        sub: 2,
        correo: 'admin@example.com',
        codigoRol: 'CUSTOMER',
        sid: 'session-id',
        jti: 'jwt-id',
      }),
    ).resolves.toEqual({
      idUser: 2,
      correo: 'admin@example.com',
      idRol: 4,
      codigoRol: 'ADMIN',
      sid: 'session-id',
      jti: 'jwt-id',
    });
  });

  it('should reject a user without an assigned role', async () => {
    usersService.findById.mockResolvedValue(
      Object.assign(new User(), {
        idUser: 2,
        correo: 'admin@example.com',
        activo: true,
        rol: undefined,
      }),
    );

    await expect(
      strategy.validate({
        sub: 2,
        correo: 'admin@example.com',
        codigoRol: 'CUSTOMER',
        sid: 'session-id',
        jti: 'jwt-id',
      }),
    ).rejects.toThrow(
      new UnauthorizedException('El usuario no tiene un rol asignado'),
    );
  });

  it('should reject an access token after its session is revoked', async () => {
    authSessionService.isActive.mockResolvedValue(false);
    usersService.findById.mockResolvedValue(
      Object.assign(new User(), {
        idUser: 2,
        correo: 'customer@example.com',
        activo: true,
        rol: Object.assign(new Rol(), { idRol: 2, codigoRol: 'CUSTOMER' }),
      }),
    );

    await expect(
      strategy.validate({
        sub: 2,
        correo: 'customer@example.com',
        codigoRol: 'CUSTOMER',
        sid: 'revoked-session',
        jti: 'jwt-id',
      }),
    ).rejects.toThrow(new UnauthorizedException('Usuario no encontrado'));
  });
});
