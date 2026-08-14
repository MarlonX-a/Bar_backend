import { IsBoolean, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

export class CreateTableDto {
  @IsString()
  @Matches(/^[A-Z0-9][A-Z0-9_-]*$/)
  @Length(1, 50)
  code: string;

  @IsInt()
  @Min(1)
  @Max(100)
  capacity: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
