import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  findByEmail(correo: string) {
    return this.userRepository.findOne({
      where: { correo },
      relations: { rol: true },
    });
  }

  findByEmailForAuthentication(correo: string) {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.rol', 'rol')
      .where('user.correo = :correo', { correo })
      .getOne();
  }

  create(user: Partial<User>) {
    return this.userRepository.save(user);
  }
}
