import { Module } from '@nestjs/common';
import { RolsService } from './rols.service';
import { RolsController } from './rols.controller';
import { Rol } from './entities/rol.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Rol])],
  controllers: [RolsController],
  providers: [RolsService],
  exports: [RolsService],
})
export class RolsModule {}
