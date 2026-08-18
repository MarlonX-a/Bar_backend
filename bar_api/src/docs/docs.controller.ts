import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { openApiDocument } from './openapi-document';

@Controller('docs')
export class DocsController {
  constructor(private readonly configService: ConfigService) {}

  @Get('openapi.json')
  getOpenApiDocument() {
    if (!this.configService.getOrThrow<boolean>('OPENAPI_ENABLED')) {
      throw new NotFoundException();
    }
    return openApiDocument;
  }
}
