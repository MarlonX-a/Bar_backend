import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyInventory } from '../inventory/entities/daily-inventory.entity';
import { InventoryMovement } from '../inventory/entities/inventory-movement.entity';
import { BusinessDay, BusinessDayStatus } from '../operations/entities/business-day.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';

export interface CurrentBusinessReport {
  businessDayId: string;
  businessDate: string;
  sales: { deliveredOrderCount: number; totalCents: number; appCents: number; manualCents: number };
  verifiedPayments: Array<{ method: string; amountCents: number }>;
  inventoryMovements: Array<{ movementType: string; quantityDelta: number }>;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(BusinessDay)
    private readonly businessDayRepository: Repository<BusinessDay>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(InventoryMovement)
    private readonly movementRepository: Repository<InventoryMovement>,
  ) {}

  async getCurrentBusinessReport(): Promise<CurrentBusinessReport> {
    const businessDay = await this.businessDayRepository.findOne({
      where: { status: BusinessDayStatus.OPEN },
    });
    if (!businessDay) throw new NotFoundException('No existe una jornada operativa abierta');
    const sales = await this.orderRepository.createQueryBuilder('order')
      .select('COUNT(*)', 'deliveredOrderCount')
      .addSelect('COALESCE(SUM(order.total_cents), 0)', 'totalCents')
      .addSelect("COALESCE(SUM(CASE WHEN order.origin = 'APP' THEN order.total_cents ELSE 0 END), 0)", 'appCents')
      .addSelect("COALESCE(SUM(CASE WHEN order.origin = 'MANUAL' THEN order.total_cents ELSE 0 END), 0)", 'manualCents')
      .where('order.business_day_id = :businessDayId', { businessDayId: businessDay.idBusinessDay })
      .andWhere('order.status = :status', { status: OrderStatus.DELIVERED })
      .getRawOne<{ deliveredOrderCount: string; totalCents: string; appCents: string; manualCents: string }>();
    const verifiedPayments = await this.paymentRepository.createQueryBuilder('payment')
      .innerJoin('payment.order', 'order')
      .select('payment.method', 'method')
      .addSelect('COALESCE(SUM(payment.amount_cents), 0)', 'amountCents')
      .where('order.business_day_id = :businessDayId', { businessDayId: businessDay.idBusinessDay })
      .andWhere('payment.status = :status', { status: PaymentStatus.VERIFIED })
      .groupBy('payment.method')
      .getRawMany<{ method: string; amountCents: string }>();
    const inventoryMovements = await this.movementRepository.createQueryBuilder('movement')
      .innerJoin(DailyInventory, 'inventory', 'inventory.id_daily_inventory = movement.daily_inventory_id')
      .select('movement.movement_type', 'movementType')
      .addSelect('SUM(movement.quantity_delta)', 'quantityDelta')
      .where('inventory.business_day_id = :businessDayId', { businessDayId: businessDay.idBusinessDay })
      .groupBy('movement.movement_type')
      .getRawMany<{ movementType: string; quantityDelta: string }>();
    return {
      businessDayId: businessDay.idBusinessDay,
      businessDate: businessDay.businessDate,
      sales: {
        deliveredOrderCount: Number(sales?.deliveredOrderCount ?? 0),
        totalCents: Number(sales?.totalCents ?? 0),
        appCents: Number(sales?.appCents ?? 0),
        manualCents: Number(sales?.manualCents ?? 0),
      },
      verifiedPayments: verifiedPayments.map((payment) => ({ method: payment.method, amountCents: Number(payment.amountCents) })),
      inventoryMovements: inventoryMovements.map((movement) => ({ movementType: movement.movementType, quantityDelta: Number(movement.quantityDelta) })),
    };
  }
}
