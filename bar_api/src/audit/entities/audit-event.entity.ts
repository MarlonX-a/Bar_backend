import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('audit_events')
@Index('idx_audit_events_actor_created_at', ['actorId', 'createdAt'])
@Index('idx_audit_events_resource_created_at', ['resourceType', 'resourceId', 'createdAt'])
export class AuditEvent {
  @PrimaryGeneratedColumn('uuid', { name: 'id_audit_event' })
  idAuditEvent: string;

  @Column({ name: 'event_code', length: 100 })
  eventCode: string;

  @Column({ name: 'resource_type', length: 80 })
  resourceType: string;

  @Column({ name: 'resource_id', length: 100, nullable: true })
  resourceId?: string;

  @Column({ name: 'actor_id', nullable: true })
  actorId?: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id', referencedColumnName: 'idUser' })
  actor?: User;

  @Column({ name: 'request_id', length: 100, nullable: true })
  requestId?: string;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
