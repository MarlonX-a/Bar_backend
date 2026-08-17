import { IsIn, IsString, Length } from 'class-validator';

export class CancelOrderDto {
  @IsString()
  @Length(3, 500)
  reason: string;
}

export class CancelOrderExceptionDto extends CancelOrderDto {
  @IsIn(['RETURN_TO_STOCK', 'WASTE'])
  resolution: 'RETURN_TO_STOCK' | 'WASTE';
}
