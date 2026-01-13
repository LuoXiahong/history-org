import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsBefore } from '../../../shared/validators/is-before.validator';

/**
 * Date precision type for historical events
 */
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
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Event title is required' })
  @MinLength(3, { message: 'Title must be at least 3 characters' })
  @MaxLength(300, { message: 'Title must not exceed 300 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  title: string;

  @ApiPropertyOptional({
    description: 'Event description',
    example: 'Final defeat of Napoleon Bonaparte',
    maxLength: 10000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Start date of the event in ISO 8601 format',
    example: '1815-06-18',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid ISO 8601 date' })
  @IsBefore('dateEnd', {
    message: 'Start date must be before or equal to end date',
  })
  dateStart?: string;

  @ApiPropertyOptional({
    description: 'End date of the event in ISO 8601 format',
    example: '1815-06-18',
  })
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO 8601 date' })
  dateEnd?: string;

  @ApiPropertyOptional({
    description: 'Type of date precision',
    enum: DateType,
    example: DateType.EXACT,
  })
  @IsOptional()
  @IsEnum(DateType, {
    message: 'Date type must be one of: exact, approximate, decade, century',
  })
  dateType?: DateType;

  @ApiPropertyOptional({
    description: 'Location of the event',
    example: 'Waterloo, Belgium',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: string }) => value?.trim())
  location?: string;

  @ApiPropertyOptional({
    description: 'Associated document ID (UUID v4)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Document ID must be a valid UUID v4' })
  documentId?: string;
}
