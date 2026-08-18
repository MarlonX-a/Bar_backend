import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from 'src/users/users.service';
import { RolsService } from '../rols/rols.service';
import { DEFAULT_USER_ROLE_CODE } from '../rols/rol.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthSessionService, SessionMetadata } from './session.service';
import { randomUUID } from 'node:crypto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly rolsService: RolsService,
    private readonly authSessionService: AuthSessionService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const correo = registerDto.correo.trim().toLowerCase();
    const existe = await this.usersService.findByEmail(correo);
    if (existe) {
      throw new ConflictException('El correo electrónico ya está en uso');
    }

    const hashedContrasenia = await bcrypt.hash(registerDto.contrasenia, 10);
    const defaultRole = await this.rolsService.findByCode(
      DEFAULT_USER_ROLE_CODE,
    );

    await this.usersService.create({
      correo,
      passwordHash: hashedContrasenia,
      rol: defaultRole,
    });

    return { message: 'Usuario registrado correctamente' };
  }

  async login(
    loginDto: LoginDto,
    metadata: SessionMetadata = {},
  ): Promise<{ access_token: string; refresh_token: string; session_id: string }> {
    const existe = await this.usersService.findByEmailForAuthentication(
      loginDto.correo,
    );
    if (!existe?.activo) {
      throw new UnauthorizedException(
        'Correo electrónico o contraseña incorrectos',
      );
    }

    const contraseniaValida = await bcrypt.compare(
      loginDto.contrasenia,
      existe.passwordHash,
    );

    if (!contraseniaValida) {
      throw new UnauthorizedException(
        'Correo electrónico o contraseña incorrectos',
      );
    }

    const session = await this.authSessionService.create(existe.idUser, metadata);

    return {
      access_token: await this.issueAccessToken(existe, session.session.idSession),
      refresh_token: session.refreshToken,
      session_id: session.session.idSession,
    };
  }

  async refresh(
    refreshToken: string,
    metadata: SessionMetadata = {},
  ): Promise<{ access_token: string; refresh_token: string; session_id: string }> {
    const rotated = await this.authSessionService.rotate(refreshToken, metadata);
    return {
      access_token: await this.issueAccessToken(rotated.session.user, rotated.session.idSession),
      refresh_token: rotated.refreshToken,
      session_id: rotated.session.idSession,
    };
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    await this.authSessionService.revokeByRefreshToken(refreshToken);
    return { message: 'Sesión cerrada correctamente' };
  }

  async logoutAll(userId: number): Promise<{ message: string }> {
    await this.authSessionService.revokeAllForUser(userId);
    return { message: 'Todas las sesiones fueron revocadas' };
  }

  private issueAccessToken(user: User, sessionId: string): Promise<string> {
    return this.jwtService.signAsync({
      correo: user.correo,
      sub: user.idUser,
      codigoRol: user.rol.codigoRol,
      sid: sessionId,
      jti: randomUUID(),
    });
  }
}
