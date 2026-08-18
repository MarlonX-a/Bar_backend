import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';
import { AuthSessionService } from '../session.service';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../interfaces/authenticated-request.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly authSessionService: AuthSessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      issuer: 'cholosbar-api',
      audience: 'cholosbar-client',
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sid || !payload.jti) {
      throw new UnauthorizedException('Sesión inválida');
    }

    const [existe, sessionIsActive] = await Promise.all([
      this.usersService.findById(payload.sub),
      this.authSessionService.isActive(payload.sid),
    ]);
    if (!existe?.activo || !sessionIsActive) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (!existe.rol || typeof existe.rol.idRol !== 'number') {
      throw new UnauthorizedException('El usuario no tiene un rol asignado');
    }

    return {
      correo: existe.correo,
      idRol: existe.rol.idRol,
      codigoRol: existe.rol.codigoRol,
      idUser: existe.idUser,
      sid: payload.sid,
      jti: payload.jti,
    };
  }
}
