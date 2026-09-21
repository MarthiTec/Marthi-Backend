import { HttpStatus } from '@nestjs/common';
import { ErrorCode, ApiException } from './api-exception';

export function notFound(message: string) {
  return new ApiException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, message);
}

export function conflict(message: string, details: Record<string, unknown> = {}) {
  return new ApiException(HttpStatus.CONFLICT, ErrorCode.CONFLICT, message, details);
}

export function validation(
  message: string,
  details: Record<string, unknown> = {},
) {
  return new ApiException(
    HttpStatus.BAD_REQUEST,
    ErrorCode.VALIDATION_ERROR,
    message,
    details,
  );
}
