import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Rol } from './entities/rol.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RolsService {
  constructor(
    @InjectRepository(Rol)
    private rolRepository: Repository<Rol>
  ){}
  async create(createRolDto: CreateRolDto) {
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

  async findAll() {
    return await this.rolRepository.find();
  }

  async findOne(id: number) {
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

  async update(id: number, updateRolDto: UpdateRolDto) {
    const existeRol = await this.rolRepository.findOne({
      where: { idRol: id }
    });

    if (existeRol && updateRolDto.nombreRol !== existeRol.nombreRol) {
      const nombreExistente = await this.rolRepository.findOne({
        where: { nombreRol: updateRolDto.nombreRol}
      })

      if (nombreExistente) {
        throw new NotFoundException(
          `El rol con el nombre ${updateRolDto.nombreRol} ya existe`
        )
      }

      const updateRol = this.rolRepository.merge(existeRol, updateRolDto);
      return await this.rolRepository.save(updateRol);
    }
  }

  async remove(id: number) {
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
