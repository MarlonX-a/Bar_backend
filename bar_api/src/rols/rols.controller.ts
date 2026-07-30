import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { RolsService } from './rols.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';

@Controller('rols')
export class RolsController {
  constructor(private readonly rolsService: RolsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req, @Body() createRolDto: CreateRolDto) {
    const userRol = req.user.idRol;

    return this.rolsService.create(createRolDto, userRol);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Request() req) {
    const userRol = req.user.idRol;
    return this.rolsService.findAll(userRol);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Request() req, @Param('id') id: number) {
    const userRol = req.user.idRol;
    console.log('[RolsController] findOne userRol =', userRol,);
    return this.rolsService.findOne(+id, userRol);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Request() req, @Param('id') id: number, @Body() updateRolDto: UpdateRolDto) {
    const userRol = req.user.idRol;
    return this.rolsService.update(+id, updateRolDto, userRol);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Request() req, @Param('id') id: number) {
    const userRol = req.user.idRol;
    return this.rolsService.remove(+id, userRol);
  }
}
