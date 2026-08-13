import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { ReplaceRolePermissionsDto } from './dto/replace-role-permissions.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { Permission } from './entities/permission.entity';
import { Rol } from './entities/rol.entity';

@Injectable()
export class RolsService {
  constructor(
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async create(createRolDto: CreateRolDto, actorId: number): Promise<Rol> {
    const nombreRol = createRolDto.nombreRol.trim();
    const codigoRol = createRolDto.codigoRol.trim().toUpperCase();
    const [existingName, existingCode] = await Promise.all([
      this.rolRepository
        .createQueryBuilder('role')
        .where('LOWER(role.nombre_rol) = LOWER(:nombreRol)', { nombreRol })
        .getOne(),
      this.rolRepository.findOne({ where: { codigoRol } }),
    ]);
    if (existingName || existingCode) {
      throw new ConflictException('El código o nombre del rol ya existe');
    }

    return this.dataSource.transaction(async (manager) => {
      const roles = manager.getRepository(Rol);
      const role = await roles.save(
        roles.create({
          ...createRolDto,
          nombreRol,
          codigoRol,
          isSystem: false,
        }),
      );
      await this.auditService.record(
        {
          eventCode: 'ROLE_CREATED',
          resourceType: 'role',
          resourceId: String(role.idRol),
          actorId,
          metadata: { codigoRol: role.codigoRol },
        },
        manager,
      );
      return role;
    });
  }

  async findAll(): Promise<Rol[]> {
    return this.rolRepository.find({ relations: { permissions: true } });
  }

  async findOne(id: number): Promise<Rol> {
    return this.findExisting(id, true);
  }

  async update(id: number, updateRolDto: UpdateRolDto, actorId: number): Promise<Rol> {
    const role = await this.findExisting(id);
    this.assertMutable(role);
    const nombreRol = updateRolDto.nombreRol?.trim();
    const codigoRol = updateRolDto.codigoRol?.trim().toUpperCase();

    if (nombreRol && nombreRol !== role.nombreRol) {
      const existingName = await this.rolRepository
        .createQueryBuilder('role')
        .where('LOWER(role.nombre_rol) = LOWER(:nombreRol)', { nombreRol })
        .andWhere('role.id_rol != :id', { id })
        .getOne();
      if (existingName) {
        throw new ConflictException(`El rol con el nombre ${nombreRol} ya existe`);
      }
    }
    if (codigoRol && codigoRol !== role.codigoRol) {
      const existingCode = await this.rolRepository.findOne({ where: { codigoRol } });
      if (existingCode) {
        throw new ConflictException(`El código ${codigoRol} ya existe`);
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const roles = manager.getRepository(Rol);
      const updated = await roles.save(
        roles.merge(role, { ...updateRolDto, nombreRol, codigoRol }),
      );
      await this.auditService.record(
        {
          eventCode: 'ROLE_UPDATED',
          resourceType: 'role',
          resourceId: String(updated.idRol),
          actorId,
          metadata: { codigoRol: updated.codigoRol },
        },
        manager,
      );
      return updated;
    });
  }

  async replacePermissions(
    id: number,
    dto: ReplaceRolePermissionsDto,
    actorId: number,
  ): Promise<Rol> {
    const role = await this.findExisting(id, true);
    this.assertMutable(role);
    const permissionCodes = dto.permissionCodes.map((code) => code.trim().toUpperCase());
    const permissions = await this.permissionRepository
      .createQueryBuilder('permission')
      .where('permission.codigo_permiso IN (:...permissionCodes)', { permissionCodes })
      .getMany();
    if (permissions.length !== permissionCodes.length) {
      throw new NotFoundException('Uno o más permisos no existen');
    }

    return this.dataSource.transaction(async (manager) => {
      const roles = manager.getRepository(Rol);
      const lockedRole = await roles.findOne({
        where: { idRol: id },
        relations: { permissions: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedRole) {
        throw new NotFoundException(`El rol con el id ${id} no existe`);
      }
      this.assertMutable(lockedRole);
      lockedRole.permissions = permissions;
      const updated = await roles.save(lockedRole);
      await this.auditService.record(
        {
          eventCode: 'ROLE_PERMISSIONS_REPLACED',
          resourceType: 'role',
          resourceId: String(updated.idRol),
          actorId,
          metadata: { permissionCodes },
        },
        manager,
      );
      return updated;
    });
  }

  async remove(id: number, actorId: number): Promise<{ message: string }> {
    const role = await this.findExisting(id, true);
    this.assertMutable(role);
    if (role.users?.length) {
      throw new ConflictException('No se puede eliminar un rol que tiene usuarios asignados');
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Rol).remove(role);
      await this.auditService.record(
        {
          eventCode: 'ROLE_DELETED',
          resourceType: 'role',
          resourceId: String(role.idRol),
          actorId,
          metadata: { codigoRol: role.codigoRol },
        },
        manager,
      );
    });
    return { message: `El rol con el id ${id} ha sido eliminado` };
  }

  async findByCode(codigoRol: string): Promise<Rol> {
    const role = await this.rolRepository.findOne({ where: { codigoRol } });
    if (!role) {
      throw new NotFoundException(`El rol ${codigoRol} no existe`);
    }
    return role;
  }

  async findByCodeWithPermissions(codigoRol: string): Promise<Rol> {
    const role = await this.rolRepository.findOne({
      where: { codigoRol },
      relations: { permissions: true },
    });
    if (!role) {
      throw new NotFoundException(`El rol ${codigoRol} no existe`);
    }
    return role;
  }

  private async findExisting(id: number, includeRelations = false): Promise<Rol> {
    const role = await this.rolRepository.findOne({
      where: { idRol: id },
      relations: includeRelations ? { permissions: true, users: true } : undefined,
    });
    if (!role) {
      throw new NotFoundException(`El rol con el id ${id} no existe`);
    }
    return role;
  }

  private assertMutable(role: Rol): void {
    if (role.isSystem) {
      throw new ForbiddenException('Los roles estructurales no se pueden modificar ni eliminar');
    }
  }
}
