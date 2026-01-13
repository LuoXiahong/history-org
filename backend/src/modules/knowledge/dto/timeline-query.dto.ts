import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';
import { IsBefore } from '../../../shared/validators/is-before.validator';

export class TimelineQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of results',
    default: 50,
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(500, { message: 'Limit must not exceed 500' })
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Number of results to skip',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Offset must be an integer' })
  @Min(0, { message: 'Offset must be at least 0' })
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Filter events starting from this date (ISO 8601)',
    example: '1800-01-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid ISO 8601 date' })
  @IsBefore('dateEnd', {
    message: 'Start date must be before or equal to end date',
  })
  dateStart?: string;

  @ApiPropertyOptional({
    description: 'Filter events up to this date (ISO 8601)',
    example: '1900-12-31',
  })
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO 8601 date' })
  dateEnd?: string;
}
