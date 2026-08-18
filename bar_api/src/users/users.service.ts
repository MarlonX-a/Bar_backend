import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  findByEmail(correo: string) {
    return this.userRepository.findOne({
      where: { correo: this.normalizeEmail(correo) },
      relations: { rol: true },
    });
  }

  findByEmailForAuthentication(correo: string) {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.rol', 'rol')
      .where('LOWER(user.correo) = :correo', {
        correo: this.normalizeEmail(correo),
      })
      .getOne();
  }

  create(user: Partial<User>) {
    return this.userRepository.save({
      ...user,
      correo: user.correo ? this.normalizeEmail(user.correo) : undefined,
    });
  }

  findById(idUser: number) {
    return this.userRepository.findOne({
      where: { idUser },
      relations: { rol: true },
    });
  }

  private normalizeEmail(correo: string): string {
    return correo.trim().toLowerCase();
  }
}
