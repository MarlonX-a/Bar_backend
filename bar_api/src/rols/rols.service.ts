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
import { ADMIN_ROLE_ID } from './rol.constants';

@Injectable()
export class RolsService {
  constructor(
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,
  ) {}

  async create(createRolDto: CreateRolDto, userRol: number) {
    this.assertAdmin(userRol, 'crear roles');

    const existeRol = await this.rolRepository.findOne({
      where: { nombreRol: createRolDto.nombreRol },
    });

    if (existeRol) {
      throw new ConflictException(
        `El rol con el nombre ${createRolDto.nombreRol} ya existe`,
      );
    }

    return this.rolRepository.save(this.rolRepository.create(createRolDto));
  }

  async findAll(userRol: number) {
    this.assertAdmin(userRol, 'ver todos los roles');
    return this.rolRepository.find();
  }

  async findOne(id: number, userRol: number) {
    this.assertAdmin(userRol, 'ver un rol específico');
    return this.findExisting(id);
  }

  async update(id: number, updateRolDto: UpdateRolDto, userRol: number) {
    this.assertAdmin(userRol, 'actualizar roles');
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

    return this.rolRepository.save(
      this.rolRepository.merge(existeRol, updateRolDto),
    );
  }

  async remove(id: number, userRol: number) {
    this.assertAdmin(userRol, 'eliminar roles');
    const existeRol = await this.findExisting(id);
    await this.rolRepository.remove(existeRol);
    return { message: `El rol con el id ${id} ha sido eliminado` };
  }

  private assertAdmin(userRol: number, action: string): void {
    if (userRol !== ADMIN_ROLE_ID) {
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
