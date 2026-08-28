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
import {
  InventoryMovement,
  InventoryMovementType,
} from '../inventory/entities/inventory-movement.entity';
import { BusinessDay, BusinessDayStatus } from '../operations/entities/business-day.entity';
import { TableSession } from '../tables/entities/table-session.entity';
import { RestaurantTable } from '../tables/entities/restaurant-table.entity';
import { TablesService } from '../tables/tables.service';
import { CreateAppOrderDto } from './dto/create-app-order.dto';
import { CreateManualOrderDto } from './dto/create-manual-order.dto';
import { ListOwnOrdersQueryDto } from './dto/list-own-orders-query.dto';
import { InventoryEffectStatus, OrderItem } from './entities/order-item.entity';
import { Order, OrderOrigin, OrderStatus } from './entities/order.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { CancelOrderDto, CancelOrderExceptionDto } from './dto/cancel-order.dto';
import { ListOperationalOrdersQueryDto } from './dto/list-operational-orders-query.dto';
import { TransitionOrderDto } from './dto/transition-order.dto';

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
    const productIds = dto.items
      .map((item) => item.productId)
      .sort((left, right) => left.localeCompare(right));
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
        .sort((left, right) => left.localeCompare(right));
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
      await this.recordStatusHistory(
        manager,
        order.idOrder,
        undefined,
        OrderStatus.PENDING,
        undefined,
        'Pedido creado desde la aplicaciÃ³n',
        requestId,
      );
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

  async createManualOrder(
    dto: CreateManualOrderDto,
    actorId: number,
    idempotencyKey: string | undefined,
    requestId?: string,
  ): Promise<Order> {
    const normalizedKey = this.normalizeIdempotencyKey(idempotencyKey);
    const productIds = dto.items
      .map((item) => item.productId)
      .sort((left, right) => left.localeCompare(right));
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('Un producto solo puede aparecer una vez en el pedido');
    }
    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `manual-order:${actorId}:${normalizedKey}`,
      ]);
      if (dto.tableId) {
        const table = await manager.getRepository(RestaurantTable).findOne({
          where: { idTable: dto.tableId, active: true },
          lock: { mode: 'pessimistic_read' },
        });
        if (!table) throw new NotFoundException('La mesa no está disponible');
      }
      const record = await this.idempotencyService.start(
        { subjectKey: `user:${actorId}`, scope: 'manual-order', key: normalizedKey,
          request: { tableId: dto.tableId, items: dto.items } },
        manager, new Date(Date.now() + 24 * 60 * 60 * 1000),
      );
      if (record.completedAt && record.responseBody) return record.responseBody as unknown as Order;
      const businessDay = await manager.getRepository(BusinessDay).findOne({
        where: { status: BusinessDayStatus.OPEN }, lock: { mode: 'pessimistic_read' },
      });
      if (!businessDay) throw new ConflictException('No existe una jornada operativa abierta');
      const products = await manager.getRepository(Product).createQueryBuilder('product')
        .innerJoin('product.category', 'category')
        .where('product.id_product IN (:...productIds)', { productIds })
        .andWhere('product.active = true')
        .andWhere('product.visible_in_menu = true')
        .andWhere('category.active = true')
        .getMany();
      if (products.length !== productIds.length) throw new NotFoundException('Uno o más productos no están disponibles');
      const productsById = new Map(products.map((product) => [product.idProduct, product]));
      const trackedProductIds = products.filter((product) => product.trackInventory)
        .map((product) => product.idProduct)
        .sort((left, right) => left.localeCompare(right));
      const inventoriesByProductId = await this.lockInventories(manager, businessDay.idBusinessDay, trackedProductIds);
      const requestedByProductId = new Map(dto.items.map((item) => [item.productId, item.quantity]));
      for (const productId of trackedProductIds) {
        const inventory = inventoriesByProductId.get(productId);
        const quantity = requestedByProductId.get(productId);
        if (!inventory || !quantity || inventory.onHandQuantity - inventory.reservedQuantity < quantity) {
          throw new ConflictException('No hay existencias disponibles para uno o más productos');
        }
      }
      const totalCents = dto.items.reduce((total, item) => {
        const product = productsById.get(item.productId);
        if (!product) throw new NotFoundException('El producto no está disponible');
        return total + product.priceCents * item.quantity;
      }, 0);
      const order = await manager.getRepository(Order).save(manager.getRepository(Order).create({
        businessDayId: businessDay.idBusinessDay, tableId: dto.tableId, createdById: actorId,
        origin: OrderOrigin.MANUAL, status: OrderStatus.PENDING, totalCents, currency: 'USD',
        idempotencyKey: normalizedKey,
      }));
      const orderItems = dto.items.map((item) => {
        const product = productsById.get(item.productId);
        if (!product) throw new NotFoundException('El producto no está disponible');
        return manager.getRepository(OrderItem).create({
          orderId: order.idOrder, productId: product.idProduct, productNameSnapshot: product.name,
          unitPriceCents: product.priceCents, quantity: item.quantity,
          subtotalCents: product.priceCents * item.quantity, observation: item.observation?.trim(),
          inventoryEffectStatus: product.trackInventory ? InventoryEffectStatus.RESERVED : InventoryEffectStatus.NOT_TRACKED,
        });
      });
      const savedItems = await manager.getRepository(OrderItem).save(orderItems);
      for (const productId of trackedProductIds) {
        const inventory = inventoriesByProductId.get(productId);
        const quantity = requestedByProductId.get(productId);
        if (!inventory || !quantity) throw new ConflictException('El producto no tiene inventario diario disponible');
        inventory.reservedQuantity += quantity;
      }
      await manager.getRepository(DailyInventory).save([...inventoriesByProductId.values()]);
      order.items = savedItems;
      await this.recordStatusHistory(manager, order.idOrder, undefined, OrderStatus.PENDING, actorId, 'Pedido manual creado', requestId);
      await this.auditService.record({ eventCode: 'MANUAL_ORDER_CREATED', resourceType: 'order', resourceId: order.idOrder,
        actorId, requestId, metadata: { tableId: order.tableId, totalCents: order.totalCents, itemCount: savedItems.length } }, manager);
      await this.idempotencyService.complete(record, 201, order as unknown as Record<string, unknown>, manager);
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

  async listOperationalOrders(
    query: ListOperationalOrdersQueryDto,
  ): Promise<Order[]> {
    return this.orderRepository.find({
      where: query.status ? { status: query.status } : undefined,
      relations: { items: true, table: true },
      order: { createdAt: 'ASC' },
      take: query.limit,
      skip: query.offset,
    });
  }

  async getStatusHistory(id: string): Promise<OrderStatusHistory[]> {
    const order = await this.orderRepository.findOne({ where: { idOrder: id } });
    if (!order) {
      throw new NotFoundException('El pedido no existe');
    }
    return this.dataSource.getRepository(OrderStatusHistory).find({
      where: { orderId: id },
      relations: { actor: true },
      order: { createdAt: 'ASC' },
    });
  }

  async transition(
    id: string,
    dto: TransitionOrderDto,
    actorId: number,
    requestId?: string,
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = await this.lockOrder(manager, id);
      this.assertAllowedTransition(order.status, dto.targetStatus);
      if (dto.targetStatus === OrderStatus.REJECTED) {
        await this.releaseReservations(manager, order, actorId, 'RETURN_TO_STOCK');
      }
      if (dto.targetStatus === OrderStatus.DELIVERED) {
        await this.consumeReservations(manager, order, actorId, requestId);
      }
      const previousStatus = order.status;
      order.status = dto.targetStatus;
      const updated = await manager.getRepository(Order).save(order);
      await this.recordStatusHistory(
        manager,
        updated.idOrder,
        previousStatus,
        updated.status,
        actorId,
        dto.reason?.trim(),
        requestId,
      );
      await this.auditService.record(
        {
          eventCode: 'ORDER_STATUS_CHANGED',
          resourceType: 'order',
          resourceId: updated.idOrder,
          actorId,
          requestId,
          metadata: { previousStatus, nextStatus: updated.status },
        },
        manager,
      );
      return updated;
    });
  }

  async cancelOwnPendingOrder(
    id: string,
    dto: CancelOrderDto,
    rawTableSessionToken: string | undefined,
    requestId?: string,
  ): Promise<Order> {
    const tableSession = await this.resolveTableSession(rawTableSessionToken);
    return this.dataSource.transaction(async (manager) => {
      const order = await this.lockOrder(manager, id);
      if (order.tableSessionId !== tableSession.idTableSession) {
        throw new NotFoundException('El pedido no existe');
      }
      if (order.status !== OrderStatus.PENDING) {
        throw new ConflictException('Solo se pueden cancelar pedidos pendientes');
      }
      await this.releaseReservations(manager, order, undefined, 'RETURN_TO_STOCK');
      const previousStatus = order.status;
      order.status = OrderStatus.CANCELLED;
      const updated = await manager.getRepository(Order).save(order);
      await this.recordStatusHistory(
        manager,
        updated.idOrder,
        previousStatus,
        updated.status,
        undefined,
        dto.reason.trim(),
        requestId,
      );
      await this.auditService.record(
        {
          eventCode: 'ORDER_CANCELLED_BY_CUSTOMER',
          resourceType: 'order',
          resourceId: updated.idOrder,
          requestId,
          metadata: { previousStatus },
        },
        manager,
      );
      return updated;
    });
  }

  async cancelException(
    id: string,
    dto: CancelOrderExceptionDto,
    actorId: number,
    requestId?: string,
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = await this.lockOrder(manager, id);
      if (![OrderStatus.PREPARING, OrderStatus.READY].includes(order.status)) {
        throw new ConflictException(
          'La cancelaciÃ³n excepcional solo aplica a pedidos en preparaciÃ³n o listos',
        );
      }
      await this.releaseReservations(manager, order, actorId, dto.resolution, requestId);
      const previousStatus = order.status;
      order.status = OrderStatus.CANCELLED;
      const updated = await manager.getRepository(Order).save(order);
      await this.recordStatusHistory(
        manager,
        updated.idOrder,
        previousStatus,
        updated.status,
        actorId,
        dto.reason.trim(),
        requestId,
      );
      await this.auditService.record(
        {
          eventCode: 'ORDER_CANCELLED_EXCEPTIONALLY',
          resourceType: 'order',
          resourceId: updated.idOrder,
          actorId,
          requestId,
          metadata: { previousStatus, resolution: dto.resolution },
        },
        manager,
      );
      return updated;
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

  private async lockOrder(manager: EntityManager, id: string): Promise<Order> {
    const repository = manager.getRepository(Order);
    // Postgres refuses FOR UPDATE on the nullable side of an outer join, and
    // loading `items` here would make TypeORM emit exactly that. Lock the order
    // row on its own, then read the items under the same transaction.
    const order = await repository.findOne({
      where: { idOrder: id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!order) {
      throw new NotFoundException('El pedido no existe');
    }
    order.items = await manager.getRepository(OrderItem).find({
      where: { orderId: order.idOrder },
    });
    return order;
  }

  private assertAllowedTransition(
    current: OrderStatus,
    target: TransitionOrderDto['targetStatus'],
  ): void {
    const transitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.PENDING]: [OrderStatus.ACCEPTED, OrderStatus.REJECTED],
      [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING],
      [OrderStatus.PREPARING]: [OrderStatus.READY],
      [OrderStatus.READY]: [OrderStatus.DELIVERED],
    };
    if (!transitions[current]?.includes(target)) {
      throw new ConflictException('La transiciÃ³n de estado solicitada no estÃ¡ permitida');
    }
  }

  private async releaseReservations(
    manager: EntityManager,
    order: Order,
    actorId: number | undefined,
    resolution: 'RETURN_TO_STOCK' | 'WASTE',
    requestId?: string,
  ): Promise<void> {
    const reservedItems = order.items.filter(
      (item) => item.inventoryEffectStatus === InventoryEffectStatus.RESERVED,
    );
    const inventories = await this.lockOrderInventories(manager, order, reservedItems);
    const inventoriesByProductId = new Map(
      inventories.map((inventory) => [inventory.productId, inventory]),
    );
    const wasteMovements: InventoryMovement[] = [];
    for (const item of reservedItems) {
      const inventory = inventoriesByProductId.get(item.productId);
      if (!inventory || inventory.reservedQuantity < item.quantity) {
        throw new ConflictException('La reserva de inventario del pedido es inconsistente');
      }
      const balanceBefore = inventory.onHandQuantity;
      inventory.reservedQuantity -= item.quantity;
      if (resolution === 'WASTE') {
        if (actorId === undefined || inventory.onHandQuantity < item.quantity) {
          throw new ConflictException('No se puede registrar el desperdicio solicitado');
        }
        inventory.onHandQuantity -= item.quantity;
        item.inventoryEffectStatus = InventoryEffectStatus.WASTED;
        wasteMovements.push(
          manager.getRepository(InventoryMovement).create({
            dailyInventoryId: inventory.idDailyInventory,
            orderId: order.idOrder,
            orderItemId: item.idOrderItem,
            movementType: InventoryMovementType.WASTE,
            quantityDelta: -item.quantity,
            balanceBefore,
            balanceAfter: inventory.onHandQuantity,
            actorId,
            observation: 'CancelaciÃ³n de pedido: desperdicio',
            requestId: requestId?.slice(0, 100),
          }),
        );
      } else {
        item.inventoryEffectStatus = InventoryEffectStatus.RELEASED;
      }
    }
    await manager.getRepository(DailyInventory).save(inventories);
    await manager.getRepository(OrderItem).save(reservedItems);
    if (wasteMovements.length > 0) {
      await manager.getRepository(InventoryMovement).save(wasteMovements);
    }
  }

  private async consumeReservations(
    manager: EntityManager,
    order: Order,
    actorId: number,
    requestId?: string,
  ): Promise<void> {
    const reservedItems = order.items.filter(
      (item) => item.inventoryEffectStatus === InventoryEffectStatus.RESERVED,
    );
    const inventories = await this.lockOrderInventories(manager, order, reservedItems);
    const inventoriesByProductId = new Map(
      inventories.map((inventory) => [inventory.productId, inventory]),
    );
    const saleMovements: InventoryMovement[] = [];
    for (const item of reservedItems) {
      const inventory = inventoriesByProductId.get(item.productId);
      if (
        !inventory ||
        inventory.reservedQuantity < item.quantity ||
        inventory.onHandQuantity < item.quantity
      ) {
        throw new ConflictException('La reserva de inventario del pedido es inconsistente');
      }
      const balanceBefore = inventory.onHandQuantity;
      inventory.reservedQuantity -= item.quantity;
      inventory.onHandQuantity -= item.quantity;
      item.inventoryEffectStatus = InventoryEffectStatus.CONSUMED;
      saleMovements.push(
        manager.getRepository(InventoryMovement).create({
          dailyInventoryId: inventory.idDailyInventory,
          orderId: order.idOrder,
          orderItemId: item.idOrderItem,
          movementType:
            order.origin === OrderOrigin.MANUAL
              ? InventoryMovementType.MANUAL_SALE
              : InventoryMovementType.APP_SALE,
          quantityDelta: -item.quantity,
          balanceBefore,
          balanceAfter: inventory.onHandQuantity,
          actorId,
          observation:
            order.origin === OrderOrigin.MANUAL
              ? 'Pedido manual entregado'
              : 'Pedido APP entregado',
          requestId: requestId?.slice(0, 100),
        }),
      );
    }
    await manager.getRepository(DailyInventory).save(inventories);
    await manager.getRepository(OrderItem).save(reservedItems);
    if (saleMovements.length > 0) {
      await manager.getRepository(InventoryMovement).save(saleMovements);
    }
  }

  private async lockOrderInventories(
    manager: EntityManager,
    order: Order,
    items: OrderItem[],
  ): Promise<DailyInventory[]> {
    if (items.length === 0) {
      return [];
    }
    const productIds = items
      .map((item) => item.productId)
      .sort((left, right) => left.localeCompare(right));
    const inventories = await manager
      .getRepository(DailyInventory)
      .createQueryBuilder('inventory')
      .setLock('pessimistic_write')
      .where('inventory.business_day_id = :businessDayId', {
        businessDayId: order.businessDayId,
      })
      .andWhere('inventory.product_id IN (:...productIds)', { productIds })
      .orderBy('inventory.product_id', 'ASC')
      .getMany();
    if (inventories.length !== productIds.length) {
      throw new ConflictException('No se encontrÃ³ el inventario reservado del pedido');
    }
    return inventories;
  }

  private async recordStatusHistory(
    manager: EntityManager,
    orderId: string,
    previousStatus: OrderStatus | undefined,
    nextStatus: OrderStatus,
    actorId: number | undefined,
    reason: string | undefined,
    requestId: string | undefined,
  ): Promise<void> {
    await manager.getRepository(OrderStatusHistory).save(
      manager.getRepository(OrderStatusHistory).create({
        orderId,
        previousStatus,
        nextStatus,
        actorId,
        reason,
        requestId: requestId?.slice(0, 100),
      }),
    );
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
