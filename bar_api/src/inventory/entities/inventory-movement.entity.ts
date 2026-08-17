import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { DailyInventory } from './daily-inventory.entity';
import { Order } from '../../orders/entities/order.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';

export enum InventoryMovementType {
  OPENING_STOCK = 'OPENING_STOCK',
  RESTOCK = 'RESTOCK',
  APP_SALE = 'APP_SALE',
  MANUAL_SALE = 'MANUAL_SALE',
  GIFT = 'GIFT',
  OWNER_CONSUMPTION = 'OWNER_CONSUMPTION',
  STAFF_CONSUMPTION = 'STAFF_CONSUMPTION',
  WASTE = 'WASTE',
  POSITIVE_ADJUSTMENT = 'POSITIVE_ADJUSTMENT',
  NEGATIVE_ADJUSTMENT = 'NEGATIVE_ADJUSTMENT',
  SALE_REVERSAL = 'SALE_REVERSAL',
}

@Entity('inventory_movements')
@Index('idx_inventory_movements_inventory_created', ['dailyInventoryId', 'createdAt'])
@Index('idx_inventory_movements_type_created', ['movementType', 'createdAt'])
@Check('CHK_inventory_movements_non_zero_delta', 'quantity_delta <> 0')
@Check('CHK_inventory_movements_balances_non_negative', 'balance_before >= 0 AND balance_after >= 0')
export class InventoryMovement {
  @PrimaryGeneratedColumn('uuid', { name: 'id_inventory_movement' })
  idInventoryMovement: string;

  @Column({ name: 'daily_inventory_id', type: 'uuid' })
  dailyInventoryId: string;

  @ManyToOne(() => DailyInventory, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'daily_inventory_id', referencedColumnName: 'idDailyInventory' })
  dailyInventory: DailyInventory;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId?: string;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id', referencedColumnName: 'idOrder' })
  order?: Order;

  @Column({ name: 'order_item_id', type: 'uuid', nullable: true })
  orderItemId?: string;

  @ManyToOne(() => OrderItem, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_item_id', referencedColumnName: 'idOrderItem' })
  orderItem?: OrderItem;

  @Column({ name: 'movement_type', length: 32 })
  movementType: InventoryMovementType;

  @Column({ name: 'quantity_delta', type: 'integer' })
  quantityDelta: number;

  @Column({ name: 'balance_before', type: 'integer' })
  balanceBefore: number;

  @Column({ name: 'balance_after', type: 'integer' })
  balanceAfter: number;

  @Column({ name: 'actor_id' })
  actorId: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actor_id', referencedColumnName: 'idUser' })
  actor: User;

  @Column({ length: 500 })
  observation: string;

  @Column({ name: 'request_id', length: 100, nullable: true })
  requestId?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
