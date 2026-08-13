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
} from 'typeorm';
import { Category } from './category.entity';

@Entity('products')
@Check('CHK_products_price_cents_non_negative', 'price_cents >= 0')
@Index('idx_products_category_visible', ['categoryId', 'active', 'visibleInMenu'])
export class Product {
  @PrimaryGeneratedColumn('uuid', { name: 'id_product' })
  idProduct: string;

  @Column({ length: 64, unique: true })
  sku: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 1000, nullable: true })
  description?: string;

  @Column({ name: 'price_cents', type: 'integer' })
  priceCents: number;

  @Column({ name: 'image_url', length: 2048, nullable: true })
  imageUrl?: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.products, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id', referencedColumnName: 'idCategory' })
  category: Category;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'visible_in_menu', default: true })
  visibleInMenu: boolean;

  @Column({ name: 'track_inventory', default: true })
  trackInventory: boolean;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
