import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class TransitionOrderDto {
  @IsIn([
    OrderStatus.ACCEPTED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.DELIVERED,
    OrderStatus.REJECTED,
  ])
  targetStatus:
    | OrderStatus.ACCEPTED
    | OrderStatus.PREPARING
    | OrderStatus.READY
    | OrderStatus.DELIVERED
    | OrderStatus.REJECTED;

  @IsOptional()
  @IsString()
  @Length(3, 500)
  reason?: string;
}
