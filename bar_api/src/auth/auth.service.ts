import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from 'src/users/users.service';
import { Rol } from '../rols/entities/rol.entity';
import { DEFAULT_USER_ROLE_ID } from '../rols/rol.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const existe = await this.usersService.findByEmail(registerDto.correo);
    if (existe) {
      throw new ConflictException('El correo electrónico ya está en uso');
    }

    const hashedContrasenia = await bcrypt.hash(registerDto.contrasenia, 10);
    await this.usersService.create({
      ...registerDto,
      contrasenia: hashedContrasenia,
      rol: { idRol: DEFAULT_USER_ROLE_ID } as Rol,
    });

    return { message: 'Usuario registrado correctamente' };
  }

  async login(loginDto: LoginDto): Promise<{ access_token: string }> {
    const existe = await this.usersService.findByEmail(loginDto.correo);
    if (!existe) {
      throw new UnauthorizedException(
        'Correo electrónico o contraseña incorrectos',
      );
    }

    const contraseniaValida = await bcrypt.compare(
      loginDto.contrasenia,
      existe.contrasenia,
    );

    if (!contraseniaValida) {
      throw new UnauthorizedException(
        'Correo electrónico o contraseña incorrectos',
      );
    }

    const payload = {
      correo: existe.correo,
      sub: existe.idUser,
      idRol: existe.rol?.idRol ?? DEFAULT_USER_ROLE_ID,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
