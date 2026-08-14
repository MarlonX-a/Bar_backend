import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Product } from '../../catalog/entities/product.entity';
import { BusinessDay } from '../../operations/entities/business-day.entity';

@Entity('daily_inventories')
@Index('UQ_daily_inventories_business_day_product', ['businessDayId', 'productId'], {
  unique: true,
})
@Check('CHK_daily_inventories_initial_quantity', 'initial_quantity >= 0')
@Check('CHK_daily_inventories_on_hand_quantity', 'on_hand_quantity >= 0')
@Check('CHK_daily_inventories_reserved_quantity', 'reserved_quantity >= 0')
@Check(
  'CHK_daily_inventories_reserved_not_above_on_hand',
  'reserved_quantity <= on_hand_quantity',
)
export class DailyInventory {
  @PrimaryGeneratedColumn('uuid', { name: 'id_daily_inventory' })
  idDailyInventory: string;

  @Column({ name: 'business_day_id', type: 'uuid' })
  businessDayId: string;

  @ManyToOne(() => BusinessDay, (businessDay) => businessDay.inventories, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'business_day_id', referencedColumnName: 'idBusinessDay' })
  businessDay: BusinessDay;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id', referencedColumnName: 'idProduct' })
  product: Product;

  @Column({ name: 'initial_quantity', type: 'integer' })
  initialQuantity: number;

  @Column({ name: 'on_hand_quantity', type: 'integer' })
  onHandQuantity: number;

  @Column({ name: 'reserved_quantity', type: 'integer', default: 0 })
  reservedQuantity: number;

  @VersionColumn({ name: 'version', type: 'integer', default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
