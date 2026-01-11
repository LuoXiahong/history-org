import { ApiProperty } from '@nestjs/swagger';

class PersonEventDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  dateStart?: Date;

  @ApiProperty({ required: false })
  role?: string;

  @ApiProperty({ required: false })
  context?: string;
}

class PersonDocumentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  filePath: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty({ required: false })
  context?: string;
}

export class PersonResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty({ required: false })
  firstName?: string;

  @ApiProperty({ required: false })
  lastName?: string;

  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty({ required: false })
  birthDate?: Date;

  @ApiProperty({ required: false })
  deathDate?: Date;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ type: [PersonEventDto] })
  events: PersonEventDto[];

  @ApiProperty({ type: [PersonDocumentDto] })
  documents: PersonDocumentDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
