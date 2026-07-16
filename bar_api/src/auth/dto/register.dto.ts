import { IsEmail, MinLength } from 'class-validator';

export class RegisterDto {

    @IsEmail()
    correo: string;

    @MinLength(8)
    contrasenia: string;
}