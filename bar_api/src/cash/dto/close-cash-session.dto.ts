import { IsInt, Min } from 'class-validator';

export class CloseCashSessionDto {
  @IsInt()
  @Min(0)
  declaredCents: number;
}
