import { IsInt, IsString, IsUUID, Length, Max, Min, NotEquals } from 'class-validator';

export class CreateInventoryAdjustmentDto {
  @IsUUID('4')
  productId: string;

  @IsInt()
  @Min(-1_000_000)
  @Max(1_000_000)
  @NotEquals(0)
  quantityDelta: number;

  @IsString()
  @Length(3, 500)
  observation: string;
}
