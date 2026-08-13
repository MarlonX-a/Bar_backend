import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PermissionsGuard } from '../auth/authorization/permissions.guard';
import { RequirePermissions } from '../auth/authorization/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { PermissionCode } from '../rols/permission.constants';
import { CatalogService } from './catalog.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.CATEGORY_MANAGE)
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto, @Req() req: AuthenticatedRequest) {
    return this.catalogService.createCategory(dto, req.user.idUser);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_READ)
  @Get('categories')
  findCategories() {
    return this.catalogService.findCategories();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.CATEGORY_MANAGE)
  @Patch('categories/:id')
  updateCategory(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCategoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.catalogService.updateCategory(id, dto, req.user.idUser);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.CATEGORY_MANAGE)
  @Delete('categories/:id')
  removeCategory(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.catalogService.removeCategory(id, req.user.idUser);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
  @Post('products')
  createProduct(@Body() dto: CreateProductDto, @Req() req: AuthenticatedRequest) {
    return this.catalogService.createProduct(dto, req.user.idUser);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_READ)
  @Get('products')
  findProducts(@Query() query: ListProductsQueryDto) {
    return this.catalogService.findProducts(query);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
  @Patch('products/:id')
  updateProduct(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.catalogService.updateProduct(id, dto, req.user.idUser);
  }

  @Get('menu')
  findPublicMenu() {
    return this.catalogService.findPublicMenu();
  }
}
