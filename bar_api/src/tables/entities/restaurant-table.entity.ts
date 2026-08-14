import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TableSession } from './table-session.entity';

@Entity('restaurant_tables')
export class RestaurantTable {
  @PrimaryGeneratedColumn('uuid', { name: 'id_table' })
  idTable: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ type: 'integer' })
  capacity: number;

  @Column({ name: 'qr_token_hash', length: 64, unique: true, select: false })
  qrTokenHash: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => TableSession, (session) => session.table)
  sessions: TableSession[];
}
