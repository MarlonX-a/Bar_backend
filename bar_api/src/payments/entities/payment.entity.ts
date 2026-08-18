import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';

export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  OTHER = 'OTHER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  VOIDED = 'VOIDED',
}

@Entity('payments')
@Check('CHK_payments_amount_non_negative', 'amount_cents >= 0')
export class Payment {
  @PrimaryGeneratedColumn('uuid', { name: 'id_payment' })
  idPayment: string;

  @Column({ name: 'order_id', type: 'uuid', unique: true })
  orderId: string;

  @OneToOne(() => Order, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id', referencedColumnName: 'idOrder' })
  order: Order;

  @Column({ name: 'amount_cents', type: 'integer' })
  amountCents: number;

  @Column({ length: 10 })
  method: PaymentMethod;

  @Column({ length: 10, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ length: 120, nullable: true })
  reference?: string;

  @Column({ name: 'declared_by_id' })
  declaredById: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'declared_by_id', referencedColumnName: 'idUser' })
  declaredBy: User;

  @Column({ name: 'verified_by_id', nullable: true })
  verifiedById?: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'verified_by_id', referencedColumnName: 'idUser' })
  verifiedBy?: User;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt?: Date;

  @Column({ name: 'rejected_by_id', nullable: true })
  rejectedById?: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'rejected_by_id', referencedColumnName: 'idUser' })
  rejectedBy?: User;

  @Column({ name: 'rejected_at', type: 'timestamptz', nullable: true })
  rejectedAt?: Date;

  @Column({ name: 'rejection_reason', length: 500, nullable: true })
  rejectionReason?: string;

  @Column({ name: 'voided_by_id', nullable: true })
  voidedById?: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'voided_by_id', referencedColumnName: 'idUser' })
  voidedBy?: User;

  @Column({ name: 'voided_at', type: 'timestamptz', nullable: true })
  voidedAt?: Date;

  @Column({ name: 'void_reason', length: 500, nullable: true })
  voidReason?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
