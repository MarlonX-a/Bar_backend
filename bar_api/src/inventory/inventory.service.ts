import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Product } from '../catalog/entities/product.entity';
import { IdempotencyService } from '../common/idempotency/idempotency.service';
import { BusinessDay, BusinessDayStatus } from '../operations/entities/business-day.entity';
import { CreateConsumptionDto } from './dto/create-consumption.dto';
import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';
import { ListInventoryMovementsQueryDto } from './dto/list-inventory-movements-query.dto';
import { OpenBusinessDayDto } from './dto/open-business-day.dto';
import { DailyInventory } from './entities/daily-inventory.entity';
import {
  InventoryMovement,
  InventoryMovementType,
} from './entities/inventory-movement.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(BusinessDay)
    private readonly businessDayRepository: Repository<BusinessDay>,
    @InjectRepository(DailyInventory)
    private readonly dailyInventoryRepository: Repository<DailyInventory>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(InventoryMovement)
    private readonly inventoryMovementRepository: Repository<InventoryMovement>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async openBusinessDay(
    dto: OpenBusinessDayDto,
    actorId: number,
  ): Promise<BusinessDay> {
    const businessDate = this.currentBusinessDate();
    return this.dataSource.transaction(async (manager) => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext('business_day_open'))");
      const businessDays = manager.getRepository(BusinessDay);
      const activeDay = await businessDays.findOne({
        where: { status: BusinessDayStatus.OPEN },
      });
      if (activeDay) {
        throw new ConflictException('Ya existe una jornada operativa abierta');
      }
      const existingDate = await businessDays.findOne({
        where: { businessDate },
      });
      if (existingDate) {
        throw new ConflictException('La jornada de hoy ya fue abierta y cerrada');
      }

      const products = await manager.getRepository(Product).find({
        where: { active: true, trackInventory: true },
        order: { idProduct: 'ASC' },
        lock: { mode: 'pessimistic_read' },
      });
      this.assertCompleteOpeningInventory(dto, products);
      const now = new Date();
      const businessDay = await businessDays.save(
        businessDays.create({
          businessDate,
          status: BusinessDayStatus.OPEN,
          openedById: actorId,
          openedAt: now,
        }),
      );
      const quantities = new Map(
        dto.inventories.map((inventory) => [inventory.productId, inventory.quantity]),
      );
      const inventories = products.map((product) =>
        manager.getRepository(DailyInventory).create({
          businessDayId: businessDay.idBusinessDay,
          productId: product.idProduct,
          initialQuantity: quantities.get(product.idProduct) ?? 0,
          onHandQuantity: quantities.get(product.idProduct) ?? 0,
          reservedQuantity: 0,
        }),
      );
      await manager.getRepository(DailyInventory).save(inventories);
      const openingMovements = inventories
        .filter((inventory) => inventory.initialQuantity > 0)
        .map((inventory) =>
          manager.getRepository(InventoryMovement).create({
            dailyInventoryId: inventory.idDailyInventory,
            movementType: InventoryMovementType.OPENING_STOCK,
            quantityDelta: inventory.initialQuantity,
            balanceBefore: 0,
            balanceAfter: inventory.initialQuantity,
            actorId,
            observation: 'Inventario inicial de jornada',
          }),
        );
      if (openingMovements.length > 0) {
        await manager.getRepository(InventoryMovement).save(openingMovements);
      }
      await this.auditService.record(
        {
          eventCode: 'BUSINESS_DAY_OPENED',
          resourceType: 'business_day',
          resourceId: businessDay.idBusinessDay,
          actorId,
          metadata: { businessDate, inventoryProductCount: inventories.length },
        },
        manager,
      );
      return businessDay;
    });
  }

  async getOpenBusinessDay(): Promise<BusinessDay> {
    const businessDay = await this.businessDayRepository.findOne({
      where: { status: BusinessDayStatus.OPEN },
      relations: { openedBy: true },
    });
    if (!businessDay) {
      throw new NotFoundException('No existe una jornada operativa abierta');
    }
    return businessDay;
  }

  async getOpenBusinessDayInventory(): Promise<DailyInventory[]> {
    const businessDay = await this.getOpenBusinessDay();
    return this.dailyInventoryRepository.find({
      where: { businessDayId: businessDay.idBusinessDay },
      relations: { product: true },
      order: { product: { name: 'ASC' } },
    });
  }

  async restock(
    dto: CreateInventoryMovementDto,
    actorId: number,
    idempotencyKey: string | undefined,
    requestId?: string,
  ): Promise<InventoryMovement> {
    return this.createManualMovement(
      dto.productId,
      dto.quantity,
      InventoryMovementType.RESTOCK,
      dto.observation,
      actorId,
      idempotencyKey,
      requestId,
    );
  }

  async gift(
    dto: CreateInventoryMovementDto,
    actorId: number,
    idempotencyKey: string | undefined,
    requestId?: string,
  ): Promise<InventoryMovement> {
    return this.createManualMovement(
      dto.productId,
      -dto.quantity,
      InventoryMovementType.GIFT,
      dto.observation,
      actorId,
      idempotencyKey,
      requestId,
    );
  }

  async consumption(
    dto: CreateConsumptionDto,
    actorId: number,
    idempotencyKey: string | undefined,
    requestId?: string,
  ): Promise<InventoryMovement> {
    const movementType =
      dto.consumptionKind === 'OWNER'
        ? InventoryMovementType.OWNER_CONSUMPTION
        : InventoryMovementType.STAFF_CONSUMPTION;
    return this.createManualMovement(
      dto.productId,
      -dto.quantity,
      movementType,
      dto.observation,
      actorId,
      idempotencyKey,
      requestId,
    );
  }

  async waste(
    dto: CreateInventoryMovementDto,
    actorId: number,
    idempotencyKey: string | undefined,
    requestId?: string,
  ): Promise<InventoryMovement> {
    return this.createManualMovement(
      dto.productId,
      -dto.quantity,
      InventoryMovementType.WASTE,
      dto.observation,
      actorId,
      idempotencyKey,
      requestId,
    );
  }

  async adjust(
    dto: CreateInventoryAdjustmentDto,
    actorId: number,
    idempotencyKey: string | undefined,
    requestId?: string,
  ): Promise<InventoryMovement> {
    return this.createManualMovement(
      dto.productId,
      dto.quantityDelta,
      dto.quantityDelta > 0
        ? InventoryMovementType.POSITIVE_ADJUSTMENT
        : InventoryMovementType.NEGATIVE_ADJUSTMENT,
      dto.observation,
      actorId,
      idempotencyKey,
      requestId,
    );
  }

  async listCurrentMovements(
    query: ListInventoryMovementsQueryDto,
  ): Promise<InventoryMovement[]> {
    const businessDay = await this.getOpenBusinessDay();
    const queryBuilder = this.inventoryMovementRepository
      .createQueryBuilder('movement')
      .innerJoinAndSelect('movement.dailyInventory', 'inventory')
      .innerJoinAndSelect('inventory.product', 'product')
      .where('inventory.business_day_id = :businessDayId', {
        businessDayId: businessDay.idBusinessDay,
      })
      .orderBy('movement.created_at', 'DESC')
      .take(query.limit)
      .skip(query.offset);
    if (query.productId) {
      queryBuilder.andWhere('inventory.product_id = :productId', {
        productId: query.productId,
      });
    }
    return queryBuilder.getMany();
  }

  private async createManualMovement(
    productId: string,
    quantityDelta: number,
    movementType: InventoryMovementType,
    observation: string,
    actorId: number,
    idempotencyKey: string | undefined,
    requestId?: string,
  ): Promise<InventoryMovement> {
    const normalizedKey = this.normalizeIdempotencyKey(idempotencyKey);
    const normalizedObservation = observation.trim();
    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `inventory-movement:${actorId}:${normalizedKey}`,
      ]);
      const record = await this.idempotencyService.start(
        {
          subjectKey: `user:${actorId}`,
          scope: 'inventory-movement',
          key: normalizedKey,
          request: { productId, quantityDelta, movementType, observation: normalizedObservation },
        },
        manager,
        new Date(Date.now() + 24 * 60 * 60 * 1000),
      );
      if (record.completedAt && record.responseBody) {
        return record.responseBody as unknown as InventoryMovement;
      }

      const inventory = await manager
        .getRepository(DailyInventory)
        .createQueryBuilder('inventory')
        .setLock('pessimistic_write')
        .innerJoinAndSelect(
          'inventory.businessDay',
          'businessDay',
          'businessDay.status = :status',
          { status: BusinessDayStatus.OPEN },
        )
        .where('inventory.product_id = :productId', { productId })
        .getOne();
      if (!inventory) {
        throw new NotFoundException(
          'No existe inventario diario abierto para el producto indicado',
        );
      }

      const balanceBefore = inventory.onHandQuantity;
      const balanceAfter = balanceBefore + quantityDelta;
      if (balanceAfter < inventory.reservedQuantity) {
        throw new ConflictException(
          'La operaciÃ³n reducirÃ­a existencias ya reservadas',
        );
      }
      inventory.onHandQuantity = balanceAfter;
      await manager.getRepository(DailyInventory).save(inventory);
      const movement = await manager.getRepository(InventoryMovement).save(
        manager.getRepository(InventoryMovement).create({
          dailyInventoryId: inventory.idDailyInventory,
          movementType,
          quantityDelta,
          balanceBefore,
          balanceAfter,
          actorId,
          observation: normalizedObservation,
          requestId: requestId?.slice(0, 100),
        }),
      );
      await this.auditService.record(
        {
          eventCode: 'INVENTORY_MOVEMENT_CREATED',
          resourceType: 'inventory_movement',
          resourceId: movement.idInventoryMovement,
          actorId,
          requestId,
          metadata: {
            movementType,
            productId,
            quantityDelta,
            balanceBefore,
            balanceAfter,
          },
        },
        manager,
      );
      await this.idempotencyService.complete(
        record,
        201,
        movement as unknown as Record<string, unknown>,
        manager,
      );
      return movement;
    });
  }

  private assertCompleteOpeningInventory(
    dto: OpenBusinessDayDto,
    products: Product[],
  ): void {
    const productIds = new Set(products.map((product) => product.idProduct));
    const submittedIds = new Set(dto.inventories.map((inventory) => inventory.productId));
    if (products.length === 0) {
      throw new ConflictException('No hay productos activos que requieran inventario');
    }
    if (
      submittedIds.size !== productIds.size ||
      [...submittedIds].some((productId) => !productIds.has(productId))
    ) {
      throw new ConflictException(
        'Debe declarar exactamente todos los productos activos con inventario',
      );
    }
  }

  private currentBusinessDate(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const values = new Map(parts.map((part) => [part.type, part.value]));
    return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
  }

  private normalizeIdempotencyKey(idempotencyKey: string | undefined): string {
    const key = idempotencyKey?.trim();
    if (!key || key.length < 8 || key.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
      throw new BadRequestException('Se requiere un Idempotency-Key vÃ¡lido');
    }
    return key;
  }
}
