import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Rol } from './entities/rol.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RolsService {
  private readonly adminRol: number = 4;
  constructor(
    @InjectRepository(Rol)
    private rolRepository: Repository<Rol>,
  ){}
  async create(createRolDto: CreateRolDto, userRol: number) {
    if (userRol !== this.adminRol) {
      throw new BadRequestException('Solo los administradores pueden crear roles');
    }
    const existeRol = await this.rolRepository.findOne({
      where: {nombreRol: createRolDto.nombreRol
      }});

    if (existeRol) {
      throw new NotFoundException(
        `El rol con el nombre ${createRolDto.nombreRol} ya existe`
      )
    } 
    const nuevoRol = this.rolRepository.create(createRolDto);
    return await this.rolRepository.save(nuevoRol);
  }

  async findAll(userRol: number) {
    if (userRol !== this.adminRol) {
      throw new BadRequestException('Solo los administradores pueden ver todos los roles');
    } 
    return await this.rolRepository.find();
  }

  async findOne(id: number, userRol: number) {
    if (userRol !== this.adminRol) {
      throw new BadRequestException('Solo los administradores pueden ver un rol específico');
    }
    const existeRol = await this.rolRepository.findOne({
      where: { idRol: id }
    })

    if (!existeRol) {
      throw new NotFoundException(
        `El rol con el id ${id} no existe`
      )
    }
    return existeRol;
  }

  async update(id: number, updateRolDto: UpdateRolDto, userRol: number) {
    if (userRol !== this.adminRol) {
      throw new BadRequestException('Solo los administradores pueden actualizar roles');
    }
    const existeRol = await this.rolRepository.findOne({
      where: { idRol: id }
    });

    if (!existeRol) {
      throw new NotFoundException(
        `El rol con el id ${id} no existe`
      );
    }

    if (updateRolDto.nombreRol && updateRolDto.nombreRol !== existeRol.nombreRol) {
      const nombreExistente = await this.rolRepository.findOne({
        where: { nombreRol: updateRolDto.nombreRol }
      });

      if (nombreExistente) {
        throw new BadRequestException(
          `El rol con el nombre ${updateRolDto.nombreRol} ya existe`
        );
      }
    }

    const updatedRol = this.rolRepository.merge(existeRol, updateRolDto);
    return await this.rolRepository.save(updatedRol);
  }

  async remove(id: number, userRol: number) {
    if (userRol !== this.adminRol) {
      throw new BadRequestException('Solo los administradores pueden eliminar roles');
    }
    const existeRol = await this.rolRepository.findOne({
      where: { idRol: id}
    })

    if (!existeRol) {
      throw new NotFoundException(
        `El rol con el id ${id} no existe`
      )
    }
    await this.rolRepository.remove(existeRol);
    return { message: `El rol con el id ${id} ha sido eliminado` };
  }
}
