import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class OpeningInventoryItemDto {
  @IsUUID('4')
  productId: string;

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  quantity: number;
}
