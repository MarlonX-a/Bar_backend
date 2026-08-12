import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthSession } from './entities/auth-session.entity';

export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

export interface IssuedRefreshSession {
  session: AuthSession;
  refreshToken: string;
}

interface RotationResult {
  issued?: IssuedRefreshSession;
  rejectedReason?: 'invalid' | 'expired' | 'reuse';
}

@Injectable()
export class AuthSessionService {
  private readonly refreshTokenTtlDays: number;
  private readonly refreshTokenAbsoluteDays: number;

  constructor(
    @InjectRepository(AuthSession)
    private readonly sessionRepository: Repository<AuthSession>,
    private readonly dataSource: DataSource,
    configService: ConfigService,
  ) {
    this.refreshTokenTtlDays = configService.getOrThrow<number>('REFRESH_TOKEN_TTL_DAYS');
    this.refreshTokenAbsoluteDays = configService.getOrThrow<number>('REFRESH_TOKEN_ABSOLUTE_DAYS');
  }

  async create(
    userId: number,
    metadata: SessionMetadata = {},
  ): Promise<IssuedRefreshSession> {
    const now = new Date();
    return this.createTokenSession(
      userId,
      randomUUID(),
      this.addDays(now, this.refreshTokenAbsoluteDays),
      metadata,
    );
  }

  async rotate(
    rawRefreshToken: string,
    metadata: SessionMetadata = {},
  ): Promise<IssuedRefreshSession> {
    const tokenHash = this.hash(rawRefreshToken);
    const result = await this.dataSource.transaction(
      async (manager): Promise<RotationResult> => {
        const repository = manager.getRepository(AuthSession);
        const current = await repository
          .createQueryBuilder('session')
          .setLock('pessimistic_write')
          .leftJoinAndSelect('session.user', 'user')
          .leftJoinAndSelect('user.rol', 'rol')
          .where('session.refresh_token_hash = :tokenHash', { tokenHash })
          .getOne();

        if (!current) {
          return { rejectedReason: 'invalid' };
        }

        const now = new Date();
        if (current.revokedAt) {
          await repository
            .createQueryBuilder()
            .update(AuthSession)
            .set({ revokedAt: now, revocationReason: 'refresh_token_reuse' })
            .where('family_id = :familyId', { familyId: current.familyId })
            .andWhere('revoked_at IS NULL')
            .execute();
          return { rejectedReason: 'reuse' };
        }

        if (
          current.refreshTokenExpiresAt <= now ||
          current.familyExpiresAt <= now ||
          !current.user.activo
        ) {
          current.revokedAt = now;
          current.revocationReason = 'expired_or_inactive';
          await repository.save(current);
          return { rejectedReason: 'expired' };
        }

        const next = this.buildSession(
          current.userId,
          current.familyId,
          current.familyExpiresAt,
          metadata,
        );
        next.session.user = current.user;
        current.revokedAt = now;
        current.lastUsedAt = now;
        current.revocationReason = 'rotated';
        current.replacedBySessionId = next.session.idSession;
        await repository.save(current);
        await repository.save(next.session);
        return { issued: next };
      },
    );

    if (!result.issued) {
      throw new UnauthorizedException(
        result.rejectedReason === 'expired'
          ? 'Refresh token expirado'
          : 'Refresh token inválido',
      );
    }

    return result.issued;
  }

  async revokeByRefreshToken(rawRefreshToken: string, reason = 'logout'): Promise<void> {
    await this.sessionRepository
      .createQueryBuilder()
      .update(AuthSession)
      .set({ revokedAt: new Date(), revocationReason: reason })
      .where('refresh_token_hash = :tokenHash', { tokenHash: this.hash(rawRefreshToken) })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  async revokeAllForUser(userId: number, reason = 'logout_all'): Promise<void> {
    await this.sessionRepository
      .createQueryBuilder()
      .update(AuthSession)
      .set({ revokedAt: new Date(), revocationReason: reason })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  async isActive(sessionId: string): Promise<boolean> {
    const now = new Date();
    const session = await this.sessionRepository
      .createQueryBuilder('session')
      .select('session.idSession')
      .where('session.id_session = :sessionId', { sessionId })
      .andWhere('session.revoked_at IS NULL')
      .andWhere('session.refresh_token_expires_at > :now', { now })
      .andWhere('session.family_expires_at > :now', { now })
      .getOne();
    return Boolean(session);
  }

  private async createTokenSession(
    userId: number,
    familyId: string,
    familyExpiresAt: Date,
    metadata: SessionMetadata,
  ): Promise<IssuedRefreshSession> {
    const next = this.buildSession(userId, familyId, familyExpiresAt, metadata);
    await this.sessionRepository.save(next.session);
    return next;
  }

  private buildSession(
    userId: number,
    familyId: string,
    familyExpiresAt: Date,
    metadata: SessionMetadata,
  ): IssuedRefreshSession {
    const refreshToken = randomBytes(32).toString('base64url');
    const session = this.sessionRepository.create({
      idSession: randomUUID(),
      userId,
      familyId,
      refreshTokenHash: this.hash(refreshToken),
      refreshTokenExpiresAt: this.addDays(
        new Date(),
        Math.min(this.refreshTokenTtlDays, this.daysUntil(familyExpiresAt)),
      ),
      familyExpiresAt,
      userAgent: metadata.userAgent?.slice(0, 512),
      ipAddress: metadata.ipAddress,
    });
    return { session, refreshToken };
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private daysUntil(date: Date): number {
    return Math.max(1 / 24 / 60, (date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  }
}
