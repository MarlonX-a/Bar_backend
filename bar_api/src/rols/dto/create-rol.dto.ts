import { IsString, Length, Matches } from 'class-validator';

export class CreateRolDto {
    @IsString()
    @Length(2, 50)
    @Matches(/^[A-Z][A-Z0-9_]*$/)
    codigoRol: string;

    @IsString()
    nombreRol: string;

    @IsString()
    descripcionRol: string;
}
