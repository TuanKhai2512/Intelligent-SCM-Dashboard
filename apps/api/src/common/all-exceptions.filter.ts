import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { STATUS_CODES } from 'node:http';

/** Every error leaves the API as { statusCode, error, message, details? }. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const body = exception.getResponse();
      const payload =
        typeof body === 'string' ? { message: body } : (body as { message?: unknown; details?: unknown });
      res.status(statusCode).json({
        statusCode,
        error: STATUS_CODES[statusCode] ?? 'Error',
        message: payload.message ?? exception.message,
        ...(payload.details ? { details: payload.details } : {}),
      });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(500).json({ statusCode: 500, error: 'Internal Server Error', message: 'Unexpected error' });
  }
}
