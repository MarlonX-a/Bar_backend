import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
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
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { createHash, randomBytes } from 'node:crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly rolsService: RolsService,
    private readonly authSessionService: AuthSessionService,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetRepository: Repository<PasswordResetToken>,
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

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    const authenticated = await this.usersService.findByEmailForAuthentication(user.correo);
    if (!authenticated || !(await bcrypt.compare(currentPassword, authenticated.passwordHash))) throw new UnauthorizedException('Contraseña actual incorrecta');
    if (await bcrypt.compare(newPassword, authenticated.passwordHash)) throw new BadRequestException('La nueva contraseña debe ser diferente');
    await this.usersService.updatePassword(userId, await bcrypt.hash(newPassword, 10));
    await this.authSessionService.revokeAllForUser(userId, 'password_changed');
    return { message: 'Contraseña actualizada; inicia sesión nuevamente' };
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (user?.activo) {
      const token = randomBytes(32).toString('base64url');
      await this.passwordResetRepository.update({ userId: user.idUser, usedAt: IsNull() }, { usedAt: new Date() });
      await this.passwordResetRepository.save(this.passwordResetRepository.create({ userId: user.idUser, tokenHash: this.hashToken(token), expiresAt: new Date(Date.now() + 15 * 60 * 1000) }));
      if (process.env.NODE_ENV !== 'production') console.info(`Password reset token for ${user.correo}: ${token}`);
    }
    return { message: 'Si el correo existe, recibirá instrucciones para restablecer la contraseña' };
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<{ message: string }> {
    const reset = await this.passwordResetRepository.findOne({ where: { tokenHash: this.hashToken(token) }, relations: { user: true } });
    if (!reset || reset.usedAt || reset.expiresAt <= new Date() || !reset.user.activo) throw new UnauthorizedException('El token de recuperación no es válido');
    await this.usersService.updatePassword(reset.userId, await bcrypt.hash(newPassword, 10));
    reset.usedAt = new Date();
    await this.passwordResetRepository.save(reset);
    await this.authSessionService.revokeAllForUser(reset.userId, 'password_reset');
    return { message: 'Contraseña restablecida; inicia sesión nuevamente' };
  }

  private hashToken(token: string): string { return createHash('sha256').update(token).digest('hex'); }

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
