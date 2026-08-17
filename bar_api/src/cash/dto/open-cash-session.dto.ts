import { IsInt, Min } from 'class-validator';

export class OpenCashSessionDto {
  @IsInt()
  @Min(0)
  openingCents: number;
}
