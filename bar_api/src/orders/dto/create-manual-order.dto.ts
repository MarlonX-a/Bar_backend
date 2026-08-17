import { IsOptional, IsUUID } from 'class-validator';
import { CreateAppOrderDto } from './create-app-order.dto';

export class CreateManualOrderDto extends CreateAppOrderDto {
  @IsOptional()
  @IsUUID('4')
  tableId?: string;
}
