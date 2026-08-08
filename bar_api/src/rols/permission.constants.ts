export const PermissionCode = {
  ROLE_MANAGE: 'ROLE_MANAGE',
  PROFILE_READ_SELF: 'PROFILE_READ_SELF',
  PROFILE_WRITE_SELF: 'PROFILE_WRITE_SELF',
} as const;

export type PermissionCodeValue = (typeof PermissionCode)[keyof typeof PermissionCode];
