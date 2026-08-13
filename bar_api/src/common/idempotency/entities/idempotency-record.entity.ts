import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('idempotency_records')
@Index('UQ_idempotency_subject_scope_key', ['subjectKey', 'scope', 'idempotencyKey'], {
  unique: true,
})
@Index('idx_idempotency_expires_at', ['expiresAt'])
export class IdempotencyRecord {
  @PrimaryGeneratedColumn('uuid', { name: 'id_idempotency_record' })
  idIdempotencyRecord: string;

  @Column({ name: 'subject_key', length: 150 })
  subjectKey: string;

  @Column({ length: 100 })
  scope: string;

  @Column({ name: 'idempotency_key', length: 128 })
  idempotencyKey: string;

  @Column({ name: 'request_hash', length: 64 })
  requestHash: string;

  @Column({ name: 'response_status', nullable: true })
  responseStatus?: number;

  @Column({ name: 'response_body', type: 'jsonb', nullable: true })
  responseBody?: Record<string, unknown>;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
