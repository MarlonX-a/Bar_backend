import { IsString } from 'class-validator';

export class CreateRolDto {
    @IsString()
    nombreRol: string;

    @IsString()
    descripcionRol: string;
}
