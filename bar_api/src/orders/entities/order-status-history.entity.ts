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
import { Order, OrderStatus } from './order.entity';

@Entity('order_status_history')
@Index('idx_order_status_history_order_created', ['orderId', 'createdAt'])
export class OrderStatusHistory {
  @PrimaryGeneratedColumn('uuid', { name: 'id_order_status_history' })
  idOrderStatusHistory: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id', referencedColumnName: 'idOrder' })
  order: Order;

  @Column({ name: 'previous_status', length: 10, nullable: true })
  previousStatus?: OrderStatus;

  @Column({ name: 'next_status', length: 10 })
  nextStatus: OrderStatus;

  @Column({ name: 'actor_id', nullable: true })
  actorId?: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id', referencedColumnName: 'idUser' })
  actor?: User;

  @Column({ length: 500, nullable: true })
  reason?: string;

  @Column({ name: 'request_id', length: 100, nullable: true })
  requestId?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
