import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BusinessDay } from '../../operations/entities/business-day.entity';
import { RestaurantTable } from '../../tables/entities/restaurant-table.entity';
import { TableSession } from '../../tables/entities/table-session.entity';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';

export enum OrderOrigin {
  APP = 'APP',
  MANUAL = 'MANUAL',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

@Entity('orders')
@Index('idx_orders_business_day_status', ['businessDayId', 'status'])
@Index('idx_orders_table_session_created', ['tableSessionId', 'createdAt'])
@Check('CHK_orders_total_cents_non_negative', 'total_cents >= 0')
export class Order {
  @PrimaryGeneratedColumn('uuid', { name: 'id_order' })
  idOrder: string;

  @Column({ name: 'business_day_id', type: 'uuid' })
  businessDayId: string;

  @ManyToOne(() => BusinessDay, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'business_day_id', referencedColumnName: 'idBusinessDay' })
  businessDay: BusinessDay;

  @Column({ name: 'user_id', nullable: true })
  userId?: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'idUser' })
  user?: User;

  @Column({ name: 'table_id', type: 'uuid', nullable: true })
  tableId?: string;

  @ManyToOne(() => RestaurantTable, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'table_id', referencedColumnName: 'idTable' })
  table?: RestaurantTable;

  @Column({ name: 'table_session_id', type: 'uuid', nullable: true })
  tableSessionId?: string;

  @ManyToOne(() => TableSession, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'table_session_id', referencedColumnName: 'idTableSession' })
  tableSession?: TableSession;

  @Column({ length: 10 })
  origin: OrderOrigin;

  @Column({ length: 10, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ name: 'total_cents', type: 'integer' })
  totalCents: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({ name: 'idempotency_key', length: 128, nullable: true })
  idempotencyKey?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];
}
