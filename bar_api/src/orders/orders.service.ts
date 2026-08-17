import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Product } from '../catalog/entities/product.entity';
import { IdempotencyService } from '../common/idempotency/idempotency.service';
import { DailyInventory } from '../inventory/entities/daily-inventory.entity';
import { BusinessDay, BusinessDayStatus } from '../operations/entities/business-day.entity';
import { TableSession } from '../tables/entities/table-session.entity';
import { TablesService } from '../tables/tables.service';
import { CreateAppOrderDto } from './dto/create-app-order.dto';
import { ListOwnOrdersQueryDto } from './dto/list-own-orders-query.dto';
import { InventoryEffectStatus, OrderItem } from './entities/order-item.entity';
import { Order, OrderOrigin, OrderStatus } from './entities/order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(DailyInventory)
    private readonly dailyInventoryRepository: Repository<DailyInventory>,
    @InjectRepository(TableSession)
    private readonly tableSessionRepository: Repository<TableSession>,
    private readonly dataSource: DataSource,
    private readonly tablesService: TablesService,
    private readonly idempotencyService: IdempotencyService,
    private readonly auditService: AuditService,
  ) {}

  async createAppOrder(
    dto: CreateAppOrderDto,
    rawTableSessionToken: string | undefined,
    idempotencyKey: string | undefined,
    requestId?: string,
  ): Promise<Order> {
    const tableSession = await this.resolveTableSession(rawTableSessionToken);
    const normalizedKey = this.normalizeIdempotencyKey(idempotencyKey);
    const productIds = dto.items.map((item) => item.productId).sort();
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('Un producto solo puede aparecer una vez en el pedido');
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `app-order:${tableSession.idTableSession}:${normalizedKey}`,
      ]);
      const lockedSession = await manager.getRepository(TableSession).findOne({
        where: { idTableSession: tableSession.idTableSession },
        relations: { table: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !lockedSession ||
        lockedSession.revokedAt ||
        lockedSession.expiresAt <= new Date() ||
        !lockedSession.table.active
      ) {
        throw new NotFoundException('La sesiÃ³n de mesa ya no estÃ¡ disponible');
      }
      const record = await this.idempotencyService.start(
        {
          subjectKey: `table-session:${lockedSession.idTableSession}`,
          scope: 'app-order',
          key: normalizedKey,
          request: { items: dto.items },
        },
        manager,
        new Date(Date.now() + 24 * 60 * 60 * 1000),
      );
      if (record.completedAt && record.responseBody) {
        return record.responseBody as unknown as Order;
      }

      const businessDay = await manager.getRepository(BusinessDay).findOne({
        where: { status: BusinessDayStatus.OPEN },
        lock: { mode: 'pessimistic_read' },
      });
      if (!businessDay) {
        throw new ConflictException('No existe una jornada operativa abierta');
      }

      const products = await manager
        .getRepository(Product)
        .createQueryBuilder('product')
        .innerJoin('product.category', 'category')
        .where('product.id_product IN (:...productIds)', { productIds })
        .andWhere('product.active = true')
        .andWhere('product.visible_in_menu = true')
        .andWhere('category.active = true')
        .getMany();
      if (products.length !== productIds.length) {
        throw new NotFoundException('Uno o mÃ¡s productos no estÃ¡n disponibles');
      }
      const productsById = new Map(products.map((product) => [product.idProduct, product]));
      const trackedProductIds = products
        .filter((product) => product.trackInventory)
        .map((product) => product.idProduct)
        .sort();
      const inventoriesByProductId = await this.lockInventories(
        manager,
        businessDay.idBusinessDay,
        trackedProductIds,
      );
      const requestedByProductId = new Map(
        dto.items.map((item) => [item.productId, item.quantity]),
      );
      for (const productId of trackedProductIds) {
        const inventory = inventoriesByProductId.get(productId);
        const quantity = requestedByProductId.get(productId);
        if (!inventory || !quantity) {
          throw new ConflictException('El producto no tiene inventario diario disponible');
        }
        if (inventory.onHandQuantity - inventory.reservedQuantity < quantity) {
          throw new ConflictException('No hay existencias disponibles para uno o mÃ¡s productos');
        }
      }

      const totalCents = dto.items.reduce((total, item) => {
        const product = productsById.get(item.productId);
        if (!product) {
          throw new NotFoundException('El producto no estÃ¡ disponible');
        }
        return total + product.priceCents * item.quantity;
      }, 0);
      const order = await manager.getRepository(Order).save(
        manager.getRepository(Order).create({
          businessDayId: businessDay.idBusinessDay,
          tableId: lockedSession.tableId,
          tableSessionId: lockedSession.idTableSession,
          origin: OrderOrigin.APP,
          status: OrderStatus.PENDING,
          totalCents,
          currency: 'USD',
          idempotencyKey: normalizedKey,
        }),
      );
      const orderItems = dto.items.map((item) => {
        const product = productsById.get(item.productId);
        if (!product) {
          throw new NotFoundException('El producto no estÃ¡ disponible');
        }
        const subtotalCents = product.priceCents * item.quantity;
        return manager.getRepository(OrderItem).create({
          orderId: order.idOrder,
          productId: product.idProduct,
          productNameSnapshot: product.name,
          unitPriceCents: product.priceCents,
          quantity: item.quantity,
          subtotalCents,
          observation: item.observation?.trim(),
          inventoryEffectStatus: product.trackInventory
            ? InventoryEffectStatus.RESERVED
            : InventoryEffectStatus.NOT_TRACKED,
        });
      });
      const savedItems = await manager.getRepository(OrderItem).save(orderItems);
      for (const productId of trackedProductIds) {
        const inventory = inventoriesByProductId.get(productId);
        const quantity = requestedByProductId.get(productId);
        if (!inventory || !quantity) {
          throw new ConflictException('El producto no tiene inventario diario disponible');
        }
        inventory.reservedQuantity += quantity;
      }
      await manager.getRepository(DailyInventory).save(
        [...inventoriesByProductId.values()],
      );
      order.items = savedItems;
      await this.auditService.record(
        {
          eventCode: 'APP_ORDER_CREATED',
          resourceType: 'order',
          resourceId: order.idOrder,
          requestId,
          metadata: {
            tableId: order.tableId,
            totalCents: order.totalCents,
            itemCount: savedItems.length,
          },
        },
        manager,
      );
      await this.idempotencyService.complete(
        record,
        201,
        order as unknown as Record<string, unknown>,
        manager,
      );
      return order;
    });
  }

  async listOwnOrders(
    rawTableSessionToken: string | undefined,
    query: ListOwnOrdersQueryDto,
  ): Promise<Order[]> {
    const tableSession = await this.resolveTableSession(rawTableSessionToken);
    return this.orderRepository.find({
      where: { tableSessionId: tableSession.idTableSession },
      relations: { items: true, table: true },
      order: { createdAt: 'DESC' },
      take: query.limit,
      skip: query.offset,
    });
  }

  private async lockInventories(
    manager: EntityManager,
    businessDayId: string,
    productIds: string[],
  ): Promise<Map<string, DailyInventory>> {
    if (productIds.length === 0) {
      return new Map();
    }
    const inventories = await manager
      .getRepository(DailyInventory)
      .createQueryBuilder('inventory')
      .setLock('pessimistic_write')
      .where('inventory.business_day_id = :businessDayId', { businessDayId })
      .andWhere('inventory.product_id IN (:...productIds)', { productIds })
      .orderBy('inventory.product_id', 'ASC')
      .getMany();
    return new Map(inventories.map((inventory) => [inventory.productId, inventory]));
  }

  private async resolveTableSession(
    rawTableSessionToken: string | undefined,
  ): Promise<TableSession> {
    if (!rawTableSessionToken) {
      throw new BadRequestException('Se requiere el encabezado X-Table-Session');
    }
    return this.tablesService.resolveActiveSession(rawTableSessionToken);
  }

  private normalizeIdempotencyKey(idempotencyKey: string | undefined): string {
    const key = idempotencyKey?.trim();
    if (!key || key.length < 8 || key.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
      throw new BadRequestException('Se requiere un Idempotency-Key vÃ¡lido');
    }
    return key;
  }
}
