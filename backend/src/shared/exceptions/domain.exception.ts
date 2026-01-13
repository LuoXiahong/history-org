import { HttpException, HttpStatus } from '@nestjs/common';

export interface DomainExceptionOptions {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export abstract class DomainException extends HttpException {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    options: DomainExceptionOptions,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        code: options.code,
        message: options.message,
        details: options.details,
      },
      status,
    );
    this.code = options.code;
    this.details = options.details;
  }
}
