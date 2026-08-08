import { IsOptional, IsString, IsUrl, Length, Matches } from 'class-validator';

export class CreatePerfilDto {
    @IsString()
    @Length(1, 80)
    nombrePerfil: string;

    @IsString()
    @Length(1, 80)
    apellidoPerfil: string;

    @IsString()
    @Matches(/^[+]?[0-9 ()-]{7,25}$/)
    celularPerfil: string;

    @IsOptional()
    @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
    fotoPerfil: string;
    
}
