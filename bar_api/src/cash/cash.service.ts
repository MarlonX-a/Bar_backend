import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { BusinessDay, BusinessDayStatus } from '../operations/entities/business-day.entity';
import { Payment, PaymentMethod, PaymentStatus } from '../payments/entities/payment.entity';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { CashSession, CashSessionStatus } from './entities/cash-session.entity';

@Injectable()
export class CashService {
  constructor(
    @InjectRepository(CashSession)
    private readonly cashSessionRepository: Repository<CashSession>,
    @InjectRepository(BusinessDay)
    private readonly businessDayRepository: Repository<BusinessDay>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async open(dto: OpenCashSessionDto, actorId: number, requestId?: string): Promise<CashSession> {
    return this.dataSource.transaction(async (manager) => {
      const businessDay = await this.lockOpenBusinessDay(manager);
      const existing = await manager.getRepository(CashSession).findOne({
        where: { businessDayId: businessDay.idBusinessDay },
        lock: { mode: 'pessimistic_write' },
      });
      if (existing) throw new ConflictException('La caja de esta jornada ya fue abierta');
      const cashSession = await manager.getRepository(CashSession).save(
        manager.getRepository(CashSession).create({
          businessDayId: businessDay.idBusinessDay,
          status: CashSessionStatus.OPEN,
          openingCents: dto.openingCents,
          openedById: actorId,
          openedAt: new Date(),
        }),
      );
      await this.auditService.record({
        eventCode: 'CASH_SESSION_OPENED', resourceType: 'cash_session',
        resourceId: cashSession.idCashSession, actorId, requestId,
        metadata: { businessDayId: businessDay.idBusinessDay, openingCents: cashSession.openingCents },
      }, manager);
      return cashSession;
    });
  }

  async getCurrent(): Promise<{ cashSession: CashSession; expectedCents: number }> {
    const businessDay = await this.businessDayRepository.findOne({ where: { status: BusinessDayStatus.OPEN } });
    if (!businessDay) throw new NotFoundException('No existe una jornada operativa abierta');
    const cashSession = await this.cashSessionRepository.findOne({ where: { businessDayId: businessDay.idBusinessDay } });
    if (!cashSession) throw new NotFoundException('La caja de la jornada no está abierta');
    const verifiedCashCents = await this.calculateVerifiedCashCents(
      this.dataSource.manager,
      businessDay.idBusinessDay,
    );
    return { cashSession, expectedCents: cashSession.openingCents + verifiedCashCents };
  }

  async close(dto: CloseCashSessionDto, actorId: number, requestId?: string): Promise<CashSession> {
    return this.dataSource.transaction(async (manager) => {
      const businessDay = await this.lockOpenBusinessDay(manager);
      const cashSession = await manager.getRepository(CashSession).findOne({
        where: { businessDayId: businessDay.idBusinessDay }, lock: { mode: 'pessimistic_write' },
      });
      if (!cashSession) throw new NotFoundException('La caja de la jornada no está abierta');
      if (cashSession.status !== CashSessionStatus.OPEN) throw new ConflictException('La caja ya está cerrada');
      const expectedCents =
        cashSession.openingCents +
        (await this.calculateVerifiedCashCents(manager, businessDay.idBusinessDay));
      cashSession.status = CashSessionStatus.CLOSED;
      cashSession.expectedCents = expectedCents;
      cashSession.declaredCents = dto.declaredCents;
      cashSession.differenceCents = dto.declaredCents - expectedCents;
      cashSession.closedById = actorId;
      cashSession.closedAt = new Date();
      const closed = await manager.getRepository(CashSession).save(cashSession);
      await this.auditService.record({
        eventCode: 'CASH_SESSION_CLOSED', resourceType: 'cash_session', resourceId: closed.idCashSession,
        actorId, requestId,
        metadata: { businessDayId: businessDay.idBusinessDay, expectedCents, declaredCents: closed.declaredCents, differenceCents: closed.differenceCents },
      }, manager);
      return closed;
    });
  }

  private async lockOpenBusinessDay(manager: EntityManager): Promise<BusinessDay> {
    const businessDay = await manager.getRepository(BusinessDay).findOne({
      where: { status: BusinessDayStatus.OPEN }, lock: { mode: 'pessimistic_write' },
    });
    if (!businessDay) throw new NotFoundException('No existe una jornada operativa abierta');
    return businessDay;
  }

  private async calculateVerifiedCashCents(
    manager: EntityManager,
    businessDayId: string,
  ): Promise<number> {
    const result = await manager.getRepository(Payment).createQueryBuilder('payment')
      .innerJoin('payment.order', 'order')
      .select('COALESCE(SUM(payment.amount_cents), 0)', 'expectedCents')
      .where('order.business_day_id = :businessDayId', { businessDayId })
      .andWhere('payment.status = :status', { status: PaymentStatus.VERIFIED })
      .andWhere('payment.method = :method', { method: PaymentMethod.CASH })
      .getRawOne<{ expectedCents: string }>();
    return Number(result?.expectedCents ?? 0);
  }
}
