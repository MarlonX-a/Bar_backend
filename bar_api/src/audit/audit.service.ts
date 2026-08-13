import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditEvent } from './entities/audit-event.entity';

export interface CreateAuditEvent {
  eventCode: string;
  resourceType: string;
  resourceId?: string;
  actorId?: number;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEvent)
    private readonly auditRepository: Repository<AuditEvent>,
  ) {}

  async record(
    event: CreateAuditEvent,
    manager?: EntityManager,
  ): Promise<AuditEvent> {
    const repository = manager
      ? manager.getRepository(AuditEvent)
      : this.auditRepository;
    return repository.save(repository.create(event));
  }
}
