import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePerfilDto } from './dto/create-perfil.dto';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import { Perfil } from './entities/perfil.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class PerfilService {
  constructor(
    @InjectRepository(Perfil)
    private readonly perfilRepository: Repository<Perfil>,
  ) {}

  async create(createPerfilDto: CreatePerfilDto, idUser: number) {
    const perfilExistente = await this.perfilRepository.findOne({
      where: { user: { idUser } },
    });

    if (perfilExistente) {
      throw new ConflictException('El usuario ya tiene un perfil');
    }

    const perfil = this.perfilRepository.create({
      ...createPerfilDto,
      user: { idUser } as User,
    });

    return this.perfilRepository.save(perfil);
  }

  async findOne(id: number, idUser: number) {
    return this.findOwned(id, idUser);
  }

  async update(
    id: number,
    updatePerfilDto: UpdatePerfilDto,
    idUser: number,
  ) {
    const perfil = await this.findOwned(id, idUser);
    Object.assign(perfil, updatePerfilDto);
    return this.perfilRepository.save(perfil);
  }

  async remove(id: number, idUser: number) {
    const perfil = await this.findOwned(id, idUser);
    await this.perfilRepository.remove(perfil);
    return { message: 'Perfil eliminado correctamente' };
  }

  private async findOwned(id: number, idUser: number) {
    const perfil = await this.perfilRepository.findOne({
      where: { idPerfil: id, user: { idUser } },
      relations: { user: true },
    });

    if (!perfil) {
      throw new NotFoundException('Perfil no encontrado');
    }

    return perfil;
  }
}
