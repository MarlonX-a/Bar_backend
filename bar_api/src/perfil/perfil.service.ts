import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePerfilDto } from './dto/create-perfil.dto';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import { Perfil } from './entities/perfil.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class PerfilService {
  constructor(
    @InjectRepository(Perfil)
    private readonly perfilRepository: Repository<Perfil>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createPerfilDto: CreatePerfilDto, idUser: number) {
    return this.dataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const profiles = manager.getRepository(Perfil);
      const user = await users.findOne({ where: { idUser } });
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const perfilExistente = await profiles.findOne({
        where: { user: { idUser } },
      });
      if (perfilExistente) {
        throw new ConflictException('El usuario ya tiene un perfil');
      }

      const perfilGuardado = await profiles.save(
        profiles.create({ ...createPerfilDto, user }),
      );
      user.perfilCompletado = true;
      await users.save(user);
      return perfilGuardado;
    });
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
    await this.dataSource.transaction(async (manager) => {
      const profiles = manager.getRepository(Perfil);
      const users = manager.getRepository(User);
      const perfil = await profiles.findOne({
        where: { idPerfil: id, user: { idUser } },
        relations: { user: true },
      });
      if (!perfil) {
        throw new NotFoundException('Perfil no encontrado');
      }
      await profiles.remove(perfil);
      const user = await users.findOne({ where: { idUser } });
      if (user) {
        user.perfilCompletado = false;
        await users.save(user);
      }
    });
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
