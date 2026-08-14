import { IsString, Length, Matches } from 'class-validator';

export class ExchangeQrTokenDto {
  @IsString()
  @Length(43, 100)
  @Matches(/^[A-Za-z0-9_-]+$/)
  qrToken: string;
}
