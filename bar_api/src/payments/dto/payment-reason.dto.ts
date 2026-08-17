import { IsString, Length } from 'class-validator';

export class PaymentReasonDto {
  @IsString()
  @Length(3, 500)
  reason: string;
}
