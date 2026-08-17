import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditEvent } from './entities/audit-event.entity';
import { ListAuditEventsQueryDto } from './dto/list-audit-events-query.dto';

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

  async list(query: ListAuditEventsQueryDto): Promise<AuditEvent[]> {
    const queryBuilder = this.auditRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.actor', 'actor')
      .orderBy('event.created_at', 'DESC')
      .take(query.limit)
      .skip(query.offset);
    if (query.eventCode) {
      queryBuilder.andWhere('event.event_code = :eventCode', { eventCode: query.eventCode });
    }
    if (query.resourceType) {
      queryBuilder.andWhere('event.resource_type = :resourceType', { resourceType: query.resourceType });
    }
    if (query.actorId) {
      queryBuilder.andWhere('event.actor_id = :actorId', { actorId: query.actorId });
    }
    return queryBuilder.getMany();
  }
}
