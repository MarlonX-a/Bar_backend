import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('auth_sessions')
@Index('idx_auth_sessions_user_id', ['userId'])
@Index('idx_auth_sessions_family_id', ['familyId'])
export class AuthSession {
  @PrimaryColumn('uuid', { name: 'id_session' })
  idSession: string;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'idUser' })
  user: User;

  @Column('uuid', { name: 'family_id' })
  familyId: string;

  @Column({ name: 'refresh_token_hash', unique: true, length: 64 })
  refreshTokenHash: string;

  @Column({ name: 'refresh_token_expires_at', type: 'timestamptz' })
  refreshTokenExpiresAt: Date;

  @Column({ name: 'family_expires_at', type: 'timestamptz' })
  familyExpiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt?: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date;

  @Column({ name: 'replaced_by_session_id', type: 'uuid', nullable: true })
  replacedBySessionId?: string;

  @Column({ name: 'revocation_reason', type: 'varchar', length: 64, nullable: true })
  revocationReason?: string;

  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent?: string;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress?: string;
}
