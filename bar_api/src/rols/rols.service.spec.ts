import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Rol } from './entities/rol.entity';
import { RolsService } from './rols.service';
import { Permission } from './entities/permission.entity';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { ForbiddenException } from '@nestjs/common';

describe('RolsService', () => {
  let service: RolsService;
  let roleRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    roleRepository = {
      findOne: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolsService,
        {
          provide: getRepositoryToken(Rol),
          useValue: {
            create: jest.fn(),
            find: jest.fn(),
            ...roleRepository,
            merge: jest.fn(),
            remove: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: {
            createQueryBuilder: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: { transaction: jest.fn() },
        },
        {
          provide: AuditService,
          useValue: { record: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<RolsService>(RolsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects modifications to system roles', async () => {
    roleRepository.findOne.mockResolvedValue(
      Object.assign(new Rol(), {
        idRol: 1,
        codigoRol: 'ADMIN',
        isSystem: true,
      }),
    );

    await expect(
      service.update(1, { nombreRol: 'Otro nombre' }, 99),
    ).rejects.toThrow(
      new ForbiddenException('Los roles estructurales no se pueden modificar ni eliminar'),
    );
  });
});
