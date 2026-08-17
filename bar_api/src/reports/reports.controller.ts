import { Controller, Get, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../auth/authorization/permissions.guard';
import { RequirePermissions } from '../auth/authorization/permissions.decorator';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { PermissionCode } from '../rols/permission.constants';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PermissionCode.REPORT_READ)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('current')
  getCurrent() {
    return this.reportsService.getCurrentBusinessReport();
  }
}
