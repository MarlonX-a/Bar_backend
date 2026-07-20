import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const existe = await this.usersService.findByEmail(payload.correo);
    if (!existe) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (!existe.rol || typeof existe.rol.idRol !== 'number') {
      throw new UnauthorizedException('El usuario no tiene un rol asignado');
    }

    return {
      correo: existe.correo,
      idRol: existe.rol.idRol,
      idUser: existe.idUser,
    };
  }
}
