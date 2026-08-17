import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../auth/authorization/permissions.guard';
import { RequirePermissions } from '../auth/authorization/permissions.decorator';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { PermissionCode } from '../rols/permission.constants';
import { AuditService } from './audit.service';
import { ListAuditEventsQueryDto } from './dto/list-audit-events-query.dto';

@Controller('audit-events')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PermissionCode.AUDIT_READ)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query() query: ListAuditEventsQueryDto) {
    return this.auditService.list(query);
  }
}
