import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export class DomainValidationException extends DomainException {
  public readonly errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    super(
      {
        code: 'VALIDATION_ERROR',
        message: 'One or more validation errors occurred',
        details: { errors },
      },
      HttpStatus.BAD_REQUEST,
    );
    this.errors = errors;
  }

  static fromField(field: string, message: string): DomainValidationException {
    return new DomainValidationException([{ field, message }]);
  }
}
