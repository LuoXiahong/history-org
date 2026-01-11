import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateEventDto {
  @ApiProperty({ description: 'Event title' })
  @IsString()
  title: string;

  @ApiProperty({ required: false, description: 'Event description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateStart?: string;

  @ApiProperty({ required: false, description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateEnd?: string;

  @ApiProperty({
    required: false,
    description: 'Date type (exact, approximate, decade, century)',
  })
  @IsOptional()
  @IsString()
  dateType?: string;

  @ApiProperty({ required: false, description: 'Event location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    required: false,
    description: 'Document ID (optional - events can exist without documents)',
  })
  @IsOptional()
  @IsString()
  documentId?: string;
}
