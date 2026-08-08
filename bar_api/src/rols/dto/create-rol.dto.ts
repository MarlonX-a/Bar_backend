import { IsNotEmpty, IsString, Length, Matches, MaxLength } from 'class-validator';

export class CreateRolDto {
    @IsString()
    @Length(2, 50)
    @Matches(/^[A-Z][A-Z0-9_]*$/)
    codigoRol: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    nombreRol: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    descripcionRol: string;
}
