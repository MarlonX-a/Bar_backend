import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { Rol } from './entities/rol.entity';

@Injectable()
export class RolsService {
  constructor(
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,
  ) {}

  async create(createRolDto: CreateRolDto) {

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

  async findAll() {
    return this.rolRepository.find();
  }

  async findOne(id: number) {
    return this.findExisting(id);
  }

  async update(id: number, updateRolDto: UpdateRolDto) {
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

  async remove(id: number) {
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

  async findByCodeWithPermissions(codigoRol: string): Promise<Rol> {
    const rol = await this.rolRepository.findOne({
      where: { codigoRol },
      relations: { permissions: true },
    });
    if (!rol) {
      throw new NotFoundException(`El rol ${codigoRol} no existe`);
    }
    return rol;
  }

  private async findExisting(id: number): Promise<Rol> {
    const rol = await this.rolRepository.findOne({ where: { idRol: id } });
    if (!rol) {
      throw new NotFoundException(`El rol con el id ${id} no existe`);
    }
    return rol;
  }
}
