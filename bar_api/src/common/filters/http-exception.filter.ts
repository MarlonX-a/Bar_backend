import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorPayload {
  code?: string;
  message?: string | string[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request & { requestId?: string }>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : undefined;
    const payload = this.normalize(exceptionResponse, status);

    response.status(status).json({
      statusCode: status,
      code: payload.code ?? `HTTP_${status}`,
      message: payload.message ?? 'Error interno del servidor',
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }

  private normalize(response: string | object | undefined, status: number): ErrorPayload {
    if (typeof response === 'string') {
      return { code: `HTTP_${status}`, message: response };
    }
    if (response && typeof response === 'object') {
      const payload = response as ErrorPayload;
      return {
        code: Array.isArray(payload.message) ? 'VALIDATION_ERROR' : `HTTP_${status}`,
        message: payload.message,
      };
    }
    return { code: `HTTP_${status}` };
  }
}
