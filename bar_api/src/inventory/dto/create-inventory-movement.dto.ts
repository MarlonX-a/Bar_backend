import { IsInt, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export class CreateInventoryMovementDto {
  @IsUUID('4')
  productId: string;

  @IsInt()
  @Min(1)
  @Max(1_000_000)
  quantity: number;

  @IsString()
  @Length(3, 500)
  observation: string;
}
