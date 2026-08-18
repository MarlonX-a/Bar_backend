import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { BusinessDay } from '../../operations/entities/business-day.entity';
import { User } from '../../users/entities/user.entity';

export enum CashSessionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

@Entity('cash_sessions')
@Unique('UQ_cash_sessions_business_day', ['businessDayId'])
@Check('CHK_cash_sessions_opening_non_negative', 'opening_cents >= 0')
@Check('CHK_cash_sessions_expected_non_negative', 'expected_cents IS NULL OR expected_cents >= 0')
@Check('CHK_cash_sessions_declared_non_negative', 'declared_cents IS NULL OR declared_cents >= 0')
export class CashSession {
  @PrimaryGeneratedColumn('uuid', { name: 'id_cash_session' })
  idCashSession: string;

  @Column({ name: 'business_day_id', type: 'uuid' })
  businessDayId: string;

  @ManyToOne(() => BusinessDay, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'business_day_id', referencedColumnName: 'idBusinessDay' })
  businessDay: BusinessDay;

  @Column({ length: 10, default: CashSessionStatus.OPEN })
  status: CashSessionStatus;

  @Column({ name: 'opening_cents', type: 'integer' })
  openingCents: number;

  @Column({ name: 'expected_cents', type: 'integer', nullable: true })
  expectedCents?: number;

  @Column({ name: 'declared_cents', type: 'integer', nullable: true })
  declaredCents?: number;

  @Column({ name: 'difference_cents', type: 'integer', nullable: true })
  differenceCents?: number;

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
}
