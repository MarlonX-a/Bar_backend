import { SetMetadata } from '@nestjs/common';
import { PermissionCodeValue } from '../../rols/permission.constants';

export const REQUIRED_PERMISSIONS_KEY = 'required_permissions';
export const RequirePermissions = (...permissions: PermissionCodeValue[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
