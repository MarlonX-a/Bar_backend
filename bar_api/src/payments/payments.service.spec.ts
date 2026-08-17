import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Payment, PaymentMethod, PaymentStatus } from './entities/payment.entity';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock };
  let orderRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    paymentRepository = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn((payment: unknown) =>
        Promise.resolve({ idPayment: 'a7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f', ...(payment as object) }),
      ),
      findOne: jest.fn(),
    };
    orderRepository = {
      findOne: jest.fn().mockResolvedValue({
        idOrder: 'b7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
        totalCents: 1450,
        status: OrderStatus.PENDING,
      }),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === Order ? orderRepository : paymentRepository,
      ),
    };
    const transaction = jest.fn(
      async (callback: (transactionManager: typeof manager) => Promise<unknown>) =>
        callback(manager),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: paymentRepository },
        { provide: getRepositoryToken(Order), useValue: orderRepository },
        { provide: DataSource, useValue: { transaction } },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();
    service = module.get<PaymentsService>(PaymentsService);
  });

  it('copies the exact order total instead of accepting a client amount', async () => {
    paymentRepository.findOne.mockResolvedValue(null);

    const payment = await service.create(
      {
        orderId: 'b7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
        method: PaymentMethod.CASH,
      },
      7,
    );

    expect(payment.amountCents).toBe(1450);
    expect(payment.status).toBe(PaymentStatus.PENDING);
    expect(payment.declaredById).toBe(7);
  });

  it('records the verifier and timestamp when a pending payment is verified', async () => {
    paymentRepository.findOne.mockResolvedValue({
      idPayment: 'a7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
      orderId: 'b7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
      amountCents: 1450,
      status: PaymentStatus.PENDING,
    });

    const payment = await service.verify(
      'a7c9c4a5-2f1c-4fd4-9f21-1b2a3c4d5e6f',
      8,
    );

    expect(payment.status).toBe(PaymentStatus.VERIFIED);
    expect(payment.verifiedById).toBe(8);
    expect(payment.verifiedAt).toBeInstanceOf(Date);
  });
});
