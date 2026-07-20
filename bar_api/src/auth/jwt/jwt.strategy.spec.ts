import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('test-secret'),
  } as unknown as ConfigService;

  const usersService = {
    findByEmail: jest.fn(),
  } as unknown as jest.Mocked<Pick<UsersService, 'findByEmail'>>;

  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(
      configService,
      usersService as unknown as UsersService,
    );
  });

  it('should expose the current database role in req.user', async () => {
    usersService.findByEmail.mockResolvedValue({
      idUser: 2,
      correo: 'admin@example.com',
      rol: { idRol: 4 },
    } as any);

    await expect(
      strategy.validate({ correo: 'admin@example.com', idRol: 2 }),
    ).resolves.toEqual({
      idUser: 2,
      correo: 'admin@example.com',
      idRol: 4,
    });
  });

  it('should reject a user without an assigned role', async () => {
    usersService.findByEmail.mockResolvedValue({
      idUser: 2,
      correo: 'admin@example.com',
      rol: undefined,
    } as any);

    await expect(
      strategy.validate({ correo: 'admin@example.com' }),
    ).rejects.toThrow(
      new UnauthorizedException('El usuario no tiene un rol asignado'),
    );
  });
});
