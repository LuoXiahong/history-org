import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdatePersonDto {
  @ApiPropertyOptional({
    description: 'Full name of the person',
    example: 'Napoleon Bonaparte',
    minLength: 2,
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'Full name must be a string' })
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  @MaxLength(200, { message: 'Full name must not exceed 200 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  fullName?: string;

  @ApiPropertyOptional({
    description: 'First name',
    example: 'Napoleon',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name',
    example: 'Bonaparte',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Title or profession',
    example: 'Emperor',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
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
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}
