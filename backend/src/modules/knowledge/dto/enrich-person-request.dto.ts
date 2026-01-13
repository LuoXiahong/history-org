import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class EnrichPersonRequestDto {
  @ApiProperty({
    description: 'Person name to enrich with AI',
    example: 'Napoleon Bonaparte',
    minLength: 2,
    maxLength: 200,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(200, { message: 'Name must not exceed 200 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  name: string;
}
