import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolsService } from '../../rols/rols.service';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
  const rolsService = {
    findByCodeWithPermissions: jest.fn(),
  } as unknown as jest.Mocked<Pick<RolsService, 'findByCodeWithPermissions'>>;

  const context = (codigoRol = 'CUSTOMER') =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { codigoRol } }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => jest.clearAllMocks());

  it('allows a request when every required permission is granted', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      'PROFILE_READ_SELF',
    ]);
    rolsService.findByCodeWithPermissions.mockResolvedValue({
      permissions: [{ codigoPermiso: 'PROFILE_READ_SELF' }],
    } as never);
    const guard = new PermissionsGuard(reflector, rolsService as unknown as RolsService);

    await expect(guard.canActivate(context())).resolves.toBe(true);
  });

  it('rejects a request when a permission is missing', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ROLE_MANAGE']);
    rolsService.findByCodeWithPermissions.mockResolvedValue({ permissions: [] } as never);
    const guard = new PermissionsGuard(reflector, rolsService as unknown as RolsService);

    await expect(guard.canActivate(context())).rejects.toThrow(
      new ForbiddenException('Permisos insuficientes'),
    );
  });
});
