import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { Rol } from './entities/rol.entity';
import { ADMIN_ROLE_CODE } from './rol.constants';

@Injectable()
export class RolsService {
  constructor(
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,
  ) {}

  async create(createRolDto: CreateRolDto, userRolCode: string) {
    this.assertAdmin(userRolCode, 'crear roles');

    const existeRol = await this.rolRepository.findOne({
      where: { nombreRol: createRolDto.nombreRol },
    });

    const codigoExistente = await this.rolRepository.findOne({
      where: { codigoRol: createRolDto.codigoRol },
    });

    if (existeRol || codigoExistente) {
      throw new ConflictException(
        'El código o nombre del rol ya existe',
      );
    }

    return this.rolRepository.save(this.rolRepository.create(createRolDto));
  }

  async findAll(userRolCode: string) {
    this.assertAdmin(userRolCode, 'ver todos los roles');
    return this.rolRepository.find();
  }

  async findOne(id: number, userRolCode: string) {
    this.assertAdmin(userRolCode, 'ver un rol específico');
    return this.findExisting(id);
  }

  async update(id: number, updateRolDto: UpdateRolDto, userRolCode: string) {
    this.assertAdmin(userRolCode, 'actualizar roles');
    const existeRol = await this.findExisting(id);

    if (
      updateRolDto.nombreRol &&
      updateRolDto.nombreRol !== existeRol.nombreRol
    ) {
      const nombreExistente = await this.rolRepository.findOne({
        where: { nombreRol: updateRolDto.nombreRol },
      });

      if (nombreExistente) {
        throw new ConflictException(
          `El rol con el nombre ${updateRolDto.nombreRol} ya existe`,
        );
      }
    }

    if (
      updateRolDto.codigoRol &&
      updateRolDto.codigoRol !== existeRol.codigoRol
    ) {
      const codigoExistente = await this.rolRepository.findOne({
        where: { codigoRol: updateRolDto.codigoRol },
      });

      if (codigoExistente) {
        throw new ConflictException(
          `El código ${updateRolDto.codigoRol} ya existe`,
        );
      }
    }

    return this.rolRepository.save(
      this.rolRepository.merge(existeRol, updateRolDto),
    );
  }

  async remove(id: number, userRolCode: string) {
    this.assertAdmin(userRolCode, 'eliminar roles');
    const existeRol = await this.findExisting(id);
    await this.rolRepository.remove(existeRol);
    return { message: `El rol con el id ${id} ha sido eliminado` };
  }

  async findByCode(codigoRol: string): Promise<Rol> {
    const rol = await this.rolRepository.findOne({ where: { codigoRol } });
    if (!rol) {
      throw new NotFoundException(`El rol ${codigoRol} no existe`);
    }
    return rol;
  }

  private assertAdmin(userRolCode: string, action: string): void {
    if (userRolCode !== ADMIN_ROLE_CODE) {
      throw new ForbiddenException(
        `Solo los administradores pueden ${action}`,
      );
    }
  }

  private async findExisting(id: number): Promise<Rol> {
    const rol = await this.rolRepository.findOne({ where: { idRol: id } });
    if (!rol) {
      throw new NotFoundException(`El rol con el id ${id} no existe`);
    }
    return rol;
  }
}
