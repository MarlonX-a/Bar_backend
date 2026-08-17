import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsUUID('4')
  orderId: string;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  reference?: string;
}
