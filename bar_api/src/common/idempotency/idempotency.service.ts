import { createHash } from 'node:crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { IdempotencyRecord } from './entities/idempotency-record.entity';

export interface IdempotencyContext {
  subjectKey: string;
  scope: string;
  key: string;
  request: Record<string, unknown>;
}

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(IdempotencyRecord)
    private readonly recordRepository: Repository<IdempotencyRecord>,
  ) {}

  async start(
    context: IdempotencyContext,
    manager: EntityManager,
    expiresAt: Date,
  ): Promise<IdempotencyRecord> {
    const repository = manager.getRepository(IdempotencyRecord);
    const requestHash = this.hash(context.request);
    const existing = await repository.findOne({
      where: {
        subjectKey: context.subjectKey,
        scope: context.scope,
        idempotencyKey: context.key,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException('La llave de idempotencia ya fue usada con otra solicitud');
      }
      if (!existing.completedAt) {
        throw new ConflictException('La solicitud con esta llave aún está en proceso');
      }
      return existing;
    }

    return repository.save(
      repository.create({
        subjectKey: context.subjectKey,
        scope: context.scope,
        idempotencyKey: context.key,
        requestHash,
        expiresAt,
      }),
    );
  }

  async complete(
    record: IdempotencyRecord,
    responseStatus: number,
    responseBody: Record<string, unknown>,
    manager: EntityManager,
  ): Promise<IdempotencyRecord> {
    const repository = manager.getRepository(IdempotencyRecord);
    record.responseStatus = responseStatus;
    record.responseBody = responseBody;
    record.completedAt = new Date();
    return repository.save(record);
  }

  private hash(value: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }
}
