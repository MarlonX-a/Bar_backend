import { createHash, randomBytes } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { RestaurantTable } from './entities/restaurant-table.entity';
import { TableSession } from './entities/table-session.entity';

export interface TableWithQrToken {
  table: PublicTable;
  qrToken: string;
}

export type PublicTable = Pick<
  RestaurantTable,
  'idTable' | 'code' | 'capacity' | 'active' | 'createdAt' | 'updatedAt'
>;

export interface IssuedTableSession {
  table: Pick<RestaurantTable, 'idTable' | 'code' | 'capacity'>;
  tableSessionToken: string;
  expiresAt: Date;
}

@Injectable()
export class TablesService {
  private readonly tableSessionTtlMinutes: number;

  constructor(
    @InjectRepository(RestaurantTable)
    private readonly tableRepository: Repository<RestaurantTable>,
    @InjectRepository(TableSession)
    private readonly tableSessionRepository: Repository<TableSession>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    configService: ConfigService,
  ) {
    this.tableSessionTtlMinutes = configService.getOrThrow<number>(
      'TABLE_SESSION_TTL_MINUTES',
    );
  }

  async create(dto: CreateTableDto, actorId: number): Promise<TableWithQrToken> {
    const code = dto.code.trim().toUpperCase();
    await this.ensureCodeAvailable(code);
    const qrToken = this.generateToken();
    return this.dataSource.transaction(async (manager) => {
      const tables = manager.getRepository(RestaurantTable);
      const table = await tables.save(
        tables.create({ ...dto, code, qrTokenHash: this.hash(qrToken) }),
      );
      await this.auditService.record(
        {
          eventCode: 'TABLE_CREATED',
          resourceType: 'table',
          resourceId: table.idTable,
          actorId,
          metadata: { code: table.code, capacity: table.capacity },
        },
        manager,
      );
      return { table: this.toPublicTable(table), qrToken };
    });
  }

  findAll(): Promise<RestaurantTable[]> {
    return this.tableRepository.find({ order: { code: 'ASC' } });
  }

  async update(
    id: string,
    dto: UpdateTableDto,
    actorId: number,
  ): Promise<RestaurantTable> {
    const table = await this.getTableOrThrow(id);
    const code = dto.code?.trim().toUpperCase();
    if (code && code !== table.code) {
      await this.ensureCodeAvailable(code, id);
    }
    return this.dataSource.transaction(async (manager) => {
      const tables = manager.getRepository(RestaurantTable);
      const updated = await tables.save(tables.merge(table, { ...dto, code }));
      await this.auditService.record(
        {
          eventCode: 'TABLE_UPDATED',
          resourceType: 'table',
          resourceId: updated.idTable,
          actorId,
          metadata: { code: updated.code, active: updated.active },
        },
        manager,
      );
      return updated;
    });
  }

  async rotateQr(id: string, actorId: number): Promise<TableWithQrToken> {
    await this.getTableOrThrow(id);
    const qrToken = this.generateToken();
    return this.dataSource.transaction(async (manager) => {
      const tables = manager.getRepository(RestaurantTable);
      const sessions = manager.getRepository(TableSession);
      const table = await tables.findOne({
        where: { idTable: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!table) {
        throw new NotFoundException('La mesa no existe');
      }
      table.qrTokenHash = this.hash(qrToken);
      await tables.save(table);
      await sessions
        .createQueryBuilder()
        .update(TableSession)
        .set({ revokedAt: new Date() })
        .where('table_id = :tableId', { tableId: id })
        .andWhere('revoked_at IS NULL')
        .execute();
      await this.auditService.record(
        {
          eventCode: 'TABLE_QR_ROTATED',
          resourceType: 'table',
          resourceId: table.idTable,
          actorId,
          metadata: { code: table.code },
        },
        manager,
      );
      return { table: this.toPublicTable(table), qrToken };
    });
  }

  async exchangeQrToken(rawQrToken: string): Promise<IssuedTableSession> {
    const table = await this.tableRepository
      .createQueryBuilder('table')
      .addSelect('table.qr_token_hash')
      .where('table.qr_token_hash = :qrTokenHash', {
        qrTokenHash: this.hash(rawQrToken),
      })
      .andWhere('table.active = true')
      .getOne();
    if (!table) {
      throw new UnauthorizedException('El cÃ³digo QR no es vÃ¡lido o ya no estÃ¡ activo');
    }

    const tableSessionToken = this.generateToken();
    const expiresAt = new Date(
      Date.now() + this.tableSessionTtlMinutes * 60 * 1000,
    );
    await this.tableSessionRepository.save(
      this.tableSessionRepository.create({
        tableId: table.idTable,
        sessionTokenHash: this.hash(tableSessionToken),
        expiresAt,
      }),
    );
    return {
      table: {
        idTable: table.idTable,
        code: table.code,
        capacity: table.capacity,
      },
      tableSessionToken,
      expiresAt,
    };
  }

  async resolveActiveSession(rawTableSessionToken: string): Promise<TableSession> {
    const session = await this.tableSessionRepository
      .createQueryBuilder('session')
      .innerJoinAndSelect('session.table', 'table')
      .addSelect('session.session_token_hash')
      .where('session.session_token_hash = :sessionTokenHash', {
        sessionTokenHash: this.hash(rawTableSessionToken),
      })
      .andWhere('session.expires_at > :now', { now: new Date() })
      .andWhere('session.revoked_at IS NULL')
      .andWhere('table.active = true')
      .getOne();
    if (!session) {
      throw new UnauthorizedException('La sesiÃ³n de mesa no es vÃ¡lida o expirÃ³');
    }
    return session;
  }

  private async getTableOrThrow(id: string): Promise<RestaurantTable> {
    const table = await this.tableRepository.findOne({ where: { idTable: id } });
    if (!table) {
      throw new NotFoundException('La mesa no existe');
    }
    return table;
  }

  private async ensureCodeAvailable(code: string, exceptId?: string): Promise<void> {
    const queryBuilder = this.tableRepository
      .createQueryBuilder('table')
      .where('table.code = :code', { code });
    if (exceptId) {
      queryBuilder.andWhere('table.id_table != :exceptId', { exceptId });
    }
    if (await queryBuilder.getOne()) {
      throw new ConflictException('Ya existe una mesa con ese cÃ³digo');
    }
  }

  private generateToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private toPublicTable(table: RestaurantTable): PublicTable {
    return {
      idTable: table.idTable,
      code: table.code,
      capacity: table.capacity,
      active: table.active,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
    };
  }
}
