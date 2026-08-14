import { IsIn } from 'class-validator';
import { CreateInventoryMovementDto } from './create-inventory-movement.dto';

export class CreateConsumptionDto extends CreateInventoryMovementDto {
  @IsIn(['OWNER', 'STAFF'])
  consumptionKind: 'OWNER' | 'STAFF';
}
