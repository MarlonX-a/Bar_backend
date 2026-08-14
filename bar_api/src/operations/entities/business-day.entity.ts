import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DailyInventory } from '../../inventory/entities/daily-inventory.entity';
import { User } from '../../users/entities/user.entity';

export enum BusinessDayStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

@Entity('business_days')
export class BusinessDay {
  @PrimaryGeneratedColumn('uuid', { name: 'id_business_day' })
  idBusinessDay: string;

  @Column({ name: 'business_date', type: 'date', unique: true })
  businessDate: string;

  @Column({ length: 10, default: BusinessDayStatus.OPEN })
  status: BusinessDayStatus;

  @Column({ name: 'opened_by_id' })
  openedById: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'opened_by_id', referencedColumnName: 'idUser' })
  openedBy: User;

  @Column({ name: 'opened_at', type: 'timestamptz' })
  openedAt: Date;

  @Column({ name: 'closed_by_id', nullable: true })
  closedById?: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'closed_by_id', referencedColumnName: 'idUser' })
  closedBy?: User;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => DailyInventory, (inventory) => inventory.businessDay)
  inventories: DailyInventory[];
}
