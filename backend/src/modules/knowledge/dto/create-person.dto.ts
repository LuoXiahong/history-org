import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreatePersonDto {
  @ApiProperty({ description: 'Full name of the person' })
  @IsString()
  fullName: string;

  @ApiProperty({ required: false, description: 'First name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false, description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false, description: 'Title or role' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false, description: 'Birth date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiProperty({ required: false, description: 'Death date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  deathDate?: string;

  @ApiProperty({ required: false, description: 'Biography or description' })
  @IsOptional()
  @IsString()
  description?: string;
}
