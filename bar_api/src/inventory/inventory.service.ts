import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Product } from '../catalog/entities/product.entity';
import { BusinessDay, BusinessDayStatus } from '../operations/entities/business-day.entity';
import { OpenBusinessDayDto } from './dto/open-business-day.dto';
import { DailyInventory } from './entities/daily-inventory.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(BusinessDay)
    private readonly businessDayRepository: Repository<BusinessDay>,
    @InjectRepository(DailyInventory)
    private readonly dailyInventoryRepository: Repository<DailyInventory>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
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
}
