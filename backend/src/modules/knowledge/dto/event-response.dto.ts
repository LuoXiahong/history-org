import { ApiProperty } from '@nestjs/swagger';

class EventPersonDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty({ required: false })
  role?: string;

  @ApiProperty({ required: false })
  context?: string;
}

class EventDocumentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  filePath: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty({ required: false })
  title?: string;
}

export class EventResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  dateStart?: Date;

  @ApiProperty({ required: false })
  dateEnd?: Date;

  @ApiProperty({ required: false })
  dateType?: string;

  @ApiProperty({ required: false })
  location?: string;

  @ApiProperty({ type: EventDocumentDto, required: false })
  document?: EventDocumentDto;

  @ApiProperty({ type: [EventPersonDto] })
  persons: EventPersonDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
