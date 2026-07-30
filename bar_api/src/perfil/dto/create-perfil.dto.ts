import { IsString } from "class-validator";

export class CreatePerfilDto {
    @IsString()
    nombrePerfil: string;

    @IsString()
    apellidoPerfil: string;

    @IsString()
    celularPerfil: string;

    @IsString()
    fotoPerfil: string;
    
}
