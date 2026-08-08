import { IsString, Length } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @Length(40, 128)
  refresh_token: string;
}
