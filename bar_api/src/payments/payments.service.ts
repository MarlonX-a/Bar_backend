import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentReasonDto } from './dto/payment-reason.dto';
import { Payment, PaymentStatus } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async create(
    dto: CreatePaymentDto,
    actorId: number,
    requestId?: string,
  ): Promise<Payment> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.getRepository(Order).findOne({
        where: { idOrder: dto.orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) {
        throw new NotFoundException('El pedido no existe');
      }
      if ([OrderStatus.REJECTED, OrderStatus.CANCELLED, OrderStatus.EXPIRED].includes(order.status)) {
        throw new ConflictException('No se puede registrar un pago para un pedido cancelado o rechazado');
      }
      const existing = await manager.getRepository(Payment).findOne({
        where: { orderId: order.idOrder },
        lock: { mode: 'pessimistic_write' },
      });
      if (existing) {
        throw new ConflictException('El pedido ya tiene un pago registrado');
      }
      const payment = await manager.getRepository(Payment).save(
        manager.getRepository(Payment).create({
          orderId: order.idOrder,
          amountCents: order.totalCents,
          method: dto.method,
          status: PaymentStatus.PENDING,
          reference: dto.reference?.trim(),
          declaredById: actorId,
        }),
      );
      await this.auditService.record(
        {
          eventCode: 'PAYMENT_DECLARED',
          resourceType: 'payment',
          resourceId: payment.idPayment,
          actorId,
          requestId,
          metadata: { orderId: order.idOrder, amountCents: payment.amountCents, method: payment.method },
        },
        manager,
      );
      return payment;
    });
  }

  async verify(id: string, actorId: number, requestId?: string): Promise<Payment> {
    return this.dataSource.transaction(async (manager) => {
      const payment = await this.lockPayment(manager, id);
      if (payment.status === PaymentStatus.VERIFIED) {
        return payment;
      }
      if (payment.status === PaymentStatus.VOIDED) {
        throw new ConflictException('No se puede verificar un pago anulado');
      }
      payment.status = PaymentStatus.VERIFIED;
      payment.verifiedById = actorId;
      payment.verifiedAt = new Date();
      payment.rejectedById = undefined;
      payment.rejectedAt = undefined;
      payment.rejectionReason = undefined;
      const updated = await manager.getRepository(Payment).save(payment);
      await this.auditService.record(
        {
          eventCode: 'PAYMENT_VERIFIED',
          resourceType: 'payment',
          resourceId: updated.idPayment,
          actorId,
          requestId,
          metadata: { orderId: updated.orderId, amountCents: updated.amountCents },
        },
        manager,
      );
      return updated;
    });
  }

  async reject(
    id: string,
    dto: PaymentReasonDto,
    actorId: number,
    requestId?: string,
  ): Promise<Payment> {
    return this.dataSource.transaction(async (manager) => {
      const payment = await this.lockPayment(manager, id);
      if (payment.status === PaymentStatus.REJECTED) {
        return payment;
      }
      if (payment.status === PaymentStatus.VOIDED || payment.status === PaymentStatus.VERIFIED) {
        throw new ConflictException('No se puede rechazar el pago en su estado actual');
      }
      payment.status = PaymentStatus.REJECTED;
      payment.rejectedById = actorId;
      payment.rejectedAt = new Date();
      payment.rejectionReason = dto.reason.trim();
      const updated = await manager.getRepository(Payment).save(payment);
      await this.auditService.record(
        {
          eventCode: 'PAYMENT_REJECTED',
          resourceType: 'payment',
          resourceId: updated.idPayment,
          actorId,
          requestId,
          metadata: { orderId: updated.orderId, reason: updated.rejectionReason },
        },
        manager,
      );
      return updated;
    });
  }

  async void(
    id: string,
    dto: PaymentReasonDto,
    actorId: number,
    requestId?: string,
  ): Promise<Payment> {
    return this.dataSource.transaction(async (manager) => {
      const payment = await this.lockPayment(manager, id);
      if (payment.status === PaymentStatus.VOIDED) {
        return payment;
      }
      payment.status = PaymentStatus.VOIDED;
      payment.voidedById = actorId;
      payment.voidedAt = new Date();
      payment.voidReason = dto.reason.trim();
      const updated = await manager.getRepository(Payment).save(payment);
      await this.auditService.record(
        {
          eventCode: 'PAYMENT_VOIDED',
          resourceType: 'payment',
          resourceId: updated.idPayment,
          actorId,
          requestId,
          metadata: { orderId: updated.orderId, reason: updated.voidReason },
        },
        manager,
      );
      return updated;
    });
  }

  async findByOrder(orderId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({ where: { orderId } });
    if (!payment) {
      throw new NotFoundException('El pago no existe');
    }
    return payment;
  }

  private async lockPayment(manager: EntityManager, id: string): Promise<Payment> {
    const payment = await manager.getRepository(Payment).findOne({
      where: { idPayment: id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!payment) {
      throw new NotFoundException('El pago no existe');
    }
    return payment;
  }
}
