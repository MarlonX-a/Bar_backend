import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ){}
    async register(registerDto: RegisterDto) {
        const existe = await this.usersService.findByEmail(registerDto.correo);
        if (existe) {
            throw new ConflictException(
                'El correo electrónico ya está en uso'
            )
        };

        const hashedContrasenia = await bcrypt.hash(registerDto.contrasenia, 10);
        this.usersService.create({
            ...registerDto,
            contrasenia: hashedContrasenia,
            rol: { idRol: 2 } as any,
        })

        return { message: `usuario registrado correctamente` }
    }

    async login(loginDto: LoginDto) {
        const existe = await this.usersService.findByEmail(loginDto.correo)
        if (!existe) {
            throw new UnauthorizedException(
                'Correo electrónico o contraseña incorrectos'
            );
        }

        const contraseniaValida = await bcrypt.compare(loginDto.contrasenia, existe.contrasenia);

        if (!contraseniaValida) {
            throw new UnauthorizedException(
                'Correo electrónico o contraseña incorrectos'
            );
        }

        const payload = {
            correo: existe.correo,
            sub: existe.idUser,
            idRol: existe.rol?.idRol ?? 1,
        }

        const token = this.jwtService.signAsync(payload);

        return {
            access_token: await token, 
        }
    }
}