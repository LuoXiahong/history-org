import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class EnrichPersonRequestDto {
  @ApiProperty({ description: 'Person name to enrich' })
  @IsString()
  name: string;
}
