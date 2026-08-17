import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../catalog/entities/product.entity';
import { Order } from './order.entity';

export enum InventoryEffectStatus {
  RESERVED = 'RESERVED',
  CONSUMED = 'CONSUMED',
  RELEASED = 'RELEASED',
  WASTED = 'WASTED',
  NOT_TRACKED = 'NOT_TRACKED',
}

@Entity('order_items')
@Check('CHK_order_items_quantity_positive', 'quantity > 0')
@Check('CHK_order_items_unit_price_non_negative', 'unit_price_cents >= 0')
@Check('CHK_order_items_subtotal_non_negative', 'subtotal_cents >= 0')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid', { name: 'id_order_item' })
  idOrderItem: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'order_id', referencedColumnName: 'idOrder' })
  order: Order;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id', referencedColumnName: 'idProduct' })
  product: Product;

  @Column({ name: 'product_name_snapshot', length: 150 })
  productNameSnapshot: string;

  @Column({ name: 'unit_price_cents', type: 'integer' })
  unitPriceCents: number;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ name: 'subtotal_cents', type: 'integer' })
  subtotalCents: number;

  @Column({ length: 500, nullable: true })
  observation?: string;

  @Column({ name: 'inventory_effect_status', length: 12 })
  inventoryEffectStatus: InventoryEffectStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
