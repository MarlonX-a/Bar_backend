import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
export class RequestPasswordResetDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @MaxLength(254) email: string;
}
export class ConfirmPasswordResetDto {
  @IsString() @Length(40, 128) token: string;
  @IsString() @Length(8, 128) newPassword: string;
}
