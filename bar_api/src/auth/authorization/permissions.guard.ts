import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { RolsService } from '../../rols/rols.service';
import { PermissionCodeValue } from '../../rols/permission.constants';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolsService: RolsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionCodeValue[]>(
      'required_permissions',
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user?.codigoRol) {
      throw new ForbiddenException('Permisos insuficientes');
    }

    const role = await this.rolsService.findByCodeWithPermissions(
      request.user.codigoRol,
    );
    const granted = new Set(
      (role.permissions ?? []).map((permission) => permission.codigoPermiso),
    );

    if (!required.every((permission) => granted.has(permission))) {
      throw new ForbiddenException('Permisos insuficientes');
    }

    return true;
  }
}
