import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { RolsModule } from '../rols/rols.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Product]), AuditModule, RolsModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
