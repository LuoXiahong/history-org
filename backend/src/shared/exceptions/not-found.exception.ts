import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

export class EntityNotFoundException extends DomainException {
  constructor(entityName: string, identifier: string | number) {
    super(
      {
        code: 'ENTITY_NOT_FOUND',
        message: `${entityName} with identifier '${identifier}' was not found`,
        details: { entity: entityName, identifier },
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
