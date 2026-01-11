import { ApiProperty } from '@nestjs/swagger';

export class EnrichedPersonDto {
  @ApiProperty()
  fullName: string;

  @ApiProperty({ required: false })
  firstName?: string;

  @ApiProperty({ required: false })
  lastName?: string;

  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty({ required: false })
  birthDate?: string;

  @ApiProperty({ required: false })
  deathDate?: string;

  @ApiProperty({ required: false })
  description?: string;
}
