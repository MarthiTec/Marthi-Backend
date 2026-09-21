import { HttpException, HttpStatus } from '@nestjs/common';

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeName = (typeof ErrorCode)[keyof typeof ErrorCode];

export class ApiException extends HttpException {
  constructor(
    status: HttpStatus,
    code: ErrorCodeName,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super({ success: false, error: { code, message, details } }, status);
  }
}

export function statusToErrorCode(status: number): ErrorCodeName {
  if (status === HttpStatus.BAD_REQUEST) return ErrorCode.VALIDATION_ERROR;
  if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) {
    return ErrorCode.UNAUTHORIZED;
  }
  if (status === HttpStatus.NOT_FOUND) return ErrorCode.NOT_FOUND;
  if (status === HttpStatus.CONFLICT) return ErrorCode.CONFLICT;
  if (status === HttpStatus.NOT_IMPLEMENTED) return ErrorCode.NOT_IMPLEMENTED;
  return ErrorCode.INTERNAL_ERROR;
}
