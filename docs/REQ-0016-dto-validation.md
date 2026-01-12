# REQ-0016: Enhanced DTO Validation

| Field | Value |
|-------|-------|
| **Status** | `TODO` |
| **Priority** | Medium |
| **Complexity** | Low |
| **Estimated Effort** | 2-3 hours |
| **Dependencies** | None |
| **Affects** | All backend DTOs, Controllers |

---

## 1. Overview

**Current Issue:** Some DTOs lack proper `class-validator` decorators, relying on manual validation in handlers (e.g., `if (!document)` checks in CreateEventHandler).

**Solution:** Add comprehensive validation decorators to all DTOs, letting NestJS ValidationPipe handle validation before code reaches handlers.

## 2. Objectives

- Add validation decorators to all DTOs
- Enable global ValidationPipe with strict settings
- Remove manual validation from handlers
- Improve error messages for end users
- Add Swagger documentation to DTO properties

## 3. Technical Specification

### 3.1 Global ValidationPipe Configuration

```typescript
// backend/src/main.ts
import { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // Strip unknown properties
    forbidNonWhitelisted: true, // Throw on unknown properties
    transform: true,           // Auto-transform to DTO types
    transformOptions: {
      enableImplicitConversion: true,
    },
    validationError: {
      target: false,           // Don't expose target in errors
      value: false,            // Don't expose value in errors
    },
  }),
);
```

### 3.2 DTO Examples

#### CreatePersonDto

```typescript
// backend/src/modules/knowledge/dto/create-person.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePersonDto {
  @ApiProperty({
    description: 'Full name of the person',
    example: 'Napoleon Bonaparte',
    minLength: 2,
    maxLength: 200,
  })
  @IsString({ message: 'Full name must be a string' })
  @IsNotEmpty({ message: 'Full name is required' })
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  @MaxLength(200, { message: 'Full name must not exceed 200 characters' })
  @Transform(({ value }) => value?.trim())
  fullName: string;

  @ApiPropertyOptional({
    description: 'First name',
    example: 'Napoleon',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name',
    example: 'Bonaparte',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Title or profession',
    example: 'Emperor',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({
    description: 'Birth date in ISO 8601 format',
    example: '1769-08-15',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Birth date must be a valid ISO 8601 date' })
  birthDate?: string;

  @ApiPropertyOptional({
    description: 'Death date in ISO 8601 format',
    example: '1821-05-05',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Death date must be a valid ISO 8601 date' })
  deathDate?: string;

  @ApiPropertyOptional({
    description: 'Biography or description',
    example: 'French military and political leader',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}
```

#### CreateEventDto

```typescript
// backend/src/modules/knowledge/dto/create-event.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUUID,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum DateType {
  EXACT = 'exact',
  APPROXIMATE = 'approximate',
  DECADE = 'decade',
  CENTURY = 'century',
}

export class CreateEventDto {
  @ApiProperty({
    description: 'Title of the event',
    example: 'Battle of Waterloo',
    minLength: 3,
    maxLength: 300,
  })
  @IsString()
  @IsNotEmpty({ message: 'Event title is required' })
  @MinLength(3, { message: 'Title must be at least 3 characters' })
  @MaxLength(300, { message: 'Title must not exceed 300 characters' })
  @Transform(({ value }) => value?.trim())
  title: string;

  @ApiPropertyOptional({
    description: 'Event description',
    example: 'Final defeat of Napoleon Bonaparte',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Start date of the event',
    example: '1815-06-18',
  })
  @IsOptional()
  @IsDateString()
  dateStart?: string;

  @ApiPropertyOptional({
    description: 'End date of the event',
    example: '1815-06-18',
  })
  @IsOptional()
  @IsDateString()
  dateEnd?: string;

  @ApiPropertyOptional({
    description: 'Type of date precision',
    enum: DateType,
    example: DateType.EXACT,
  })
  @IsOptional()
  @IsEnum(DateType, { message: 'Invalid date type' })
  dateType?: DateType;

  @ApiPropertyOptional({
    description: 'Location of the event',
    example: 'Waterloo, Belgium',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional({
    description: 'Associated document ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Document ID must be a valid UUID' })
  documentId?: string;
}
```

#### SearchQueryDto

```typescript
// backend/src/modules/knowledge/dto/search-query.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchQueryDto {
  @ApiProperty({
    description: 'Search query string',
    example: 'Napoleon',
    minLength: 2,
  })
  @IsString()
  @MinLength(2, { message: 'Search query must be at least 2 characters' })
  q: string;

  @ApiPropertyOptional({
    description: 'Maximum number of results',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Number of results to skip',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
```

### 3.3 Custom Validators

```typescript
// backend/src/shared/validators/is-before.validator.ts
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsBefore(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isBefore',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedPropertyName
          ];
          if (!value || !relatedValue) return true;
          return new Date(value as string) <= new Date(relatedValue as string);
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          return `${args.property} must be before ${relatedPropertyName}`;
        },
      },
    });
  };
}
```

Usage:

```typescript
export class CreateEventDto {
  @IsOptional()
  @IsDateString()
  @IsBefore('dateEnd', { message: 'Start date must be before end date' })
  dateStart?: string;

  @IsOptional()
  @IsDateString()
  dateEnd?: string;
}
```

## 4. Acceptance Criteria

- [ ] Global ValidationPipe configured with whitelist and transform
- [ ] All DTOs have proper validation decorators
- [ ] All DTOs have Swagger documentation
- [ ] Custom error messages are user-friendly
- [ ] Handlers don't contain manual validation logic
- [ ] Unknown properties are rejected (forbidNonWhitelisted)
- [ ] Date ranges are validated (start <= end)
- [ ] UUIDs are validated for references

## 5. DTOs to Update

### Knowledge Module
- [ ] CreatePersonDto
- [ ] UpdatePersonDto
- [ ] CreateEventDto
- [ ] UpdateEventDto
- [ ] SearchQueryDto
- [ ] TimelineQueryDto

### Ingestion Module
- [ ] IndexDocumentDto
- [ ] UploadDocumentDto

### Auth Module
- [ ] LoginDto ✅ (already has validation)
- [ ] RegisterDto ✅ (already has validation)

## 6. Testing Strategy

```typescript
describe('CreatePersonDto validation', () => {
  it('should reject empty fullName', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/knowledge/persons')
      .send({ fullName: '' });
    
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Full name is required');
  });

  it('should reject invalid birthDate format', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/knowledge/persons')
      .send({ fullName: 'Test', birthDate: 'invalid' });
    
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('valid ISO 8601 date');
  });

  it('should strip unknown properties', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/knowledge/persons')
      .send({ fullName: 'Test', unknownField: 'value' });
    
    expect(response.status).toBe(400); // forbidNonWhitelisted
  });
});
```

## 7. References

- [class-validator](https://github.com/typestack/class-validator)
- [class-transformer](https://github.com/typestack/class-transformer)
- [NestJS Validation](https://docs.nestjs.com/techniques/validation)
- [NestJS OpenAPI](https://docs.nestjs.com/openapi/types-and-parameters)
