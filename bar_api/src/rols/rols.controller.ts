import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RolsService } from './rols.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';

@Controller('rols')
export class RolsController {
  constructor(private readonly rolsService: RolsService) {}

  @Post()
  create(@Body() createRolDto: CreateRolDto) {
    return this.rolsService.create(createRolDto);
  }

  @Get()
  findAll() {
    return this.rolsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rolsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRolDto: UpdateRolDto) {
    return this.rolsService.update(+id, updateRolDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rolsService.remove(+id);
  }
}
