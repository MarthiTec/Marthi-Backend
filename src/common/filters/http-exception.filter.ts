import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode, statusToErrorCode } from '../errors/api-exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse &&
      'success' in exceptionResponse &&
      'error' in exceptionResponse
    ) {
      response.status(status).json(exceptionResponse);
      return;
    }

    const rawMessage =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : typeof exceptionResponse === 'object' &&
            exceptionResponse &&
            'message' in exceptionResponse
          ? (exceptionResponse as { message: string | string[] }).message
          : 'Erro interno do servidor';

    const message = Array.isArray(rawMessage) ? rawMessage[0] : rawMessage;
    const details =
      typeof exceptionResponse === 'object' &&
      exceptionResponse &&
      'details' in exceptionResponse
        ? (exceptionResponse as { details: Record<string, unknown> }).details
        : {};

    response.status(status).json({
      success: false,
      error: {
        code: statusToErrorCode(status) ?? ErrorCode.INTERNAL_ERROR,
        message,
        details,
        path: request.url,
      },
    });
  }
}
