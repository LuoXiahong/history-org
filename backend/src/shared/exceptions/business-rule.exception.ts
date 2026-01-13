import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

export class BusinessRuleException extends DomainException {
  constructor(
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

// Specific business rule exceptions
export class DuplicateEntityException extends BusinessRuleException {
  constructor(entityName: string, field: string, value: string) {
    super(
      'DUPLICATE_ENTITY',
      `${entityName} with ${field} '${value}' already exists`,
      { entity: entityName, field, value },
    );
  }
}

export class InsufficientPermissionsException extends BusinessRuleException {
  constructor(action: string, resource: string) {
    super(
      'INSUFFICIENT_PERMISSIONS',
      `You do not have permission to ${action} this ${resource}`,
      { action, resource },
    );
  }
}

export class InvalidStateException extends BusinessRuleException {
  constructor(message: string, currentState?: string, expectedState?: string) {
    super('INVALID_STATE', message, { currentState, expectedState });
  }
}
