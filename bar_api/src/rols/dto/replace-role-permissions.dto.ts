import { ArrayMaxSize, ArrayUnique, IsArray, IsString, Length } from 'class-validator';

export class ReplaceRolePermissionsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  @Length(2, 80, { each: true })
  permissionCodes: string[];
}
