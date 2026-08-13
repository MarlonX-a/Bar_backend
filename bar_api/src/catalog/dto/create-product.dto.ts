import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]*$/)
  @Length(2, 64)
  sku: string;

  @IsString()
  @Length(2, 150)
  name: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  description?: string;

  @IsInt()
  @Min(0)
  @Max(10_000_000)
  priceCents: number;

  @IsOptional()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  @Length(1, 2048)
  imageUrl?: string;

  @IsUUID('4')
  categoryId: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  visibleInMenu?: boolean;

  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  displayOrder?: number;
}
