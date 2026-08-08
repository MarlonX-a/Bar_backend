import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Rol } from '../../rols/entities/rol.entity';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('test-secret'),
  } as unknown as ConfigService;

  const usersService: jest.Mocked<Pick<UsersService, 'findByEmail'>> = {
    findByEmail: jest.fn(),
  };

  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(
      configService,
      usersService as unknown as UsersService,
    );
  });

  it('should expose the current database role in req.user', async () => {
    const role = Object.assign(new Rol(), { idRol: 4, codigoRol: 'ADMIN' });
    usersService.findByEmail.mockResolvedValue(
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
      }),
    ).resolves.toEqual({
      idUser: 2,
      correo: 'admin@example.com',
      idRol: 4,
      codigoRol: 'ADMIN',
    });
  });

  it('should reject a user without an assigned role', async () => {
    usersService.findByEmail.mockResolvedValue(
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
      }),
    ).rejects.toThrow(
      new UnauthorizedException('El usuario no tiene un rol asignado'),
    );
  });
});
