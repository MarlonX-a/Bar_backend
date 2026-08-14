import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, ValidateNested } from 'class-validator';
import { OpeningInventoryItemDto } from './opening-inventory-item.dto';

export class OpenBusinessDayDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ArrayUnique((item: OpeningInventoryItemDto) => item.productId)
  @ValidateNested({ each: true })
  @Type(() => OpeningInventoryItemDto)
  inventories: OpeningInventoryItemDto[];
}
