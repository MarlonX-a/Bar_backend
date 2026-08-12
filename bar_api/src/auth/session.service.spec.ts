import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Rol } from '../rols/entities/rol.entity';
import { AuthSession } from './entities/auth-session.entity';
import { AuthSessionService } from './session.service';

describe('AuthSessionService', () => {
  it('revokes an active token family after refresh token reuse', async () => {
    const current = Object.assign(new AuthSession(), {
      idSession: 'old-session',
      userId: 1,
      familyId: 'a6c3e8b9-48d2-449b-97b5-b7546fd25e30',
      revokedAt: new Date(),
      user: Object.assign(new User(), {
        activo: true,
        rol: Object.assign(new Rol(), { codigoRol: 'CUSTOMER' }),
      }),
    });
    const familyUpdate = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const lockedSession = {
      setLock: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(current),
    };
    const repository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(lockedSession)
        .mockReturnValueOnce(familyUpdate),
    };
    const dataSource = {
      transaction: jest.fn(
        (callback: (manager: { getRepository: () => typeof repository }) => Promise<unknown>) =>
          callback({ getRepository: () => repository }),
      ),
    };
    const configService = {
      getOrThrow: jest.fn((key: string) => (key === 'REFRESH_TOKEN_TTL_DAYS' ? 30 : 90)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthSessionService,
        { provide: getRepositoryToken(AuthSession), useValue: repository },
        { provide: DataSource, useValue: dataSource },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    const service = module.get<AuthSessionService>(AuthSessionService);

    await expect(service.rotate('reused-refresh-token')).rejects.toThrow(
      new UnauthorizedException('Refresh token inválido'),
    );
    expect(familyUpdate.execute).toHaveBeenCalledTimes(1);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });
});
