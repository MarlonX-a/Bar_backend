import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async createCategory(dto: CreateCategoryDto, actorId: number): Promise<Category> {
    const name = dto.name.trim();
    await this.ensureCategoryNameAvailable(name);
    return this.dataSource.transaction(async (manager) => {
      const categories = manager.getRepository(Category);
      const category = await categories.save(categories.create({ ...dto, name }));
      await this.auditService.record(
        {
          eventCode: 'CATEGORY_CREATED',
          resourceType: 'category',
          resourceId: category.idCategory,
          actorId,
          metadata: { name: category.name },
        },
        manager,
      );
      return category;
    });
  }

  findCategories(includeInactive = true): Promise<Category[]> {
    return this.categoryRepository.find({
      where: includeInactive ? undefined : { active: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
    actorId: number,
  ): Promise<Category> {
    const category = await this.getCategoryOrThrow(id);
    const name = dto.name?.trim();
    if (name && name !== category.name) {
      await this.ensureCategoryNameAvailable(name, id);
    }
    return this.dataSource.transaction(async (manager) => {
      const categories = manager.getRepository(Category);
      const updated = await categories.save(categories.merge(category, { ...dto, name }));
      await this.auditService.record(
        {
          eventCode: 'CATEGORY_UPDATED',
          resourceType: 'category',
          resourceId: updated.idCategory,
          actorId,
          metadata: { name: updated.name },
        },
        manager,
      );
      return updated;
    });
  }

  async removeCategory(id: string, actorId: number): Promise<{ message: string }> {
    const category = await this.getCategoryOrThrow(id);
    const productCount = await this.productRepository.count({ where: { categoryId: id } });
    if (productCount > 0) {
      throw new ConflictException('No se puede eliminar una categorÃ­a con productos');
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Category).remove(category);
      await this.auditService.record(
        {
          eventCode: 'CATEGORY_DELETED',
          resourceType: 'category',
          resourceId: category.idCategory,
          actorId,
          metadata: { name: category.name },
        },
        manager,
      );
    });
    return { message: 'CategorÃ­a eliminada' };
  }

  async createProduct(dto: CreateProductDto, actorId: number): Promise<Product> {
    const sku = dto.sku.trim().toUpperCase();
    const name = dto.name.trim();
    await Promise.all([this.getCategoryOrThrow(dto.categoryId), this.ensureSkuAvailable(sku)]);
    return this.dataSource.transaction(async (manager) => {
      const products = manager.getRepository(Product);
      const product = await products.save(
        products.create({ ...dto, sku, name }),
      );
      await this.auditService.record(
        {
          eventCode: 'PRODUCT_CREATED',
          resourceType: 'product',
          resourceId: product.idProduct,
          actorId,
          metadata: { sku: product.sku, priceCents: product.priceCents },
        },
        manager,
      );
      return product;
    });
  }

  async findProducts(query: ListProductsQueryDto): Promise<Product[]> {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .orderBy('category.display_order', 'ASC')
      .addOrderBy('product.display_order', 'ASC')
      .addOrderBy('product.name', 'ASC')
      .take(query.limit)
      .skip(query.offset);
    if (query.categoryId) {
      queryBuilder.andWhere('product.category_id = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.active !== undefined) {
      queryBuilder.andWhere('product.active = :active', { active: query.active });
    }
    return queryBuilder.getMany();
  }

  async findPublicMenu(): Promise<Product[]> {
    return this.productRepository
      .createQueryBuilder('product')
      .innerJoinAndSelect('product.category', 'category', 'category.active = true')
      .where('product.active = true')
      .andWhere('product.visible_in_menu = true')
      .orderBy('category.display_order', 'ASC')
      .addOrderBy('product.display_order', 'ASC')
      .addOrderBy('product.name', 'ASC')
      .getMany();
  }

  async updateProduct(
    id: string,
    dto: UpdateProductDto,
    actorId: number,
  ): Promise<Product> {
    const product = await this.getProductOrThrow(id);
    const sku = dto.sku?.trim().toUpperCase();
    const name = dto.name?.trim();
    if (dto.categoryId) {
      await this.getCategoryOrThrow(dto.categoryId);
    }
    if (sku && sku !== product.sku) {
      await this.ensureSkuAvailable(sku, id);
    }
    return this.dataSource.transaction(async (manager) => {
      const products = manager.getRepository(Product);
      const updated = await products.save(
        products.merge(product, { ...dto, sku, name }),
      );
      await this.auditService.record(
        {
          eventCode: 'PRODUCT_UPDATED',
          resourceType: 'product',
          resourceId: updated.idProduct,
          actorId,
          metadata: { sku: updated.sku, priceCents: updated.priceCents },
        },
        manager,
      );
      return updated;
    });
  }

  private async getCategoryOrThrow(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { idCategory: id } });
    if (!category) {
      throw new NotFoundException('La categorÃ­a no existe');
    }
    return category;
  }

  private async getProductOrThrow(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { idProduct: id },
      relations: { category: true },
    });
    if (!product) {
      throw new NotFoundException('El producto no existe');
    }
    return product;
  }

  private async ensureCategoryNameAvailable(name: string, exceptId?: string): Promise<void> {
    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .where('LOWER(category.name) = LOWER(:name)', { name });
    if (exceptId) {
      queryBuilder.andWhere('category.id_category != :exceptId', { exceptId });
    }
    if (await queryBuilder.getOne()) {
      throw new ConflictException('Ya existe una categorÃ­a con ese nombre');
    }
  }

  private async ensureSkuAvailable(sku: string, exceptId?: string): Promise<void> {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .where('product.sku = :sku', { sku });
    if (exceptId) {
      queryBuilder.andWhere('product.id_product != :exceptId', { exceptId });
    }
    if (await queryBuilder.getOne()) {
      throw new ConflictException('Ya existe un producto con ese SKU');
    }
  }
}
