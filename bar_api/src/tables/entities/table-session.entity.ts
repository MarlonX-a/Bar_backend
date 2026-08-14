import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RestaurantTable } from './restaurant-table.entity';

@Entity('table_sessions')
@Index('idx_table_sessions_table_expires', ['tableId', 'expiresAt'])
export class TableSession {
  @PrimaryGeneratedColumn('uuid', { name: 'id_table_session' })
  idTableSession: string;

  @Column({ name: 'table_id', type: 'uuid' })
  tableId: string;

  @ManyToOne(() => RestaurantTable, (table) => table.sessions, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'table_id', referencedColumnName: 'idTable' })
  table: RestaurantTable;

  @Column({ name: 'session_token_hash', length: 64, unique: true, select: false })
  sessionTokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
