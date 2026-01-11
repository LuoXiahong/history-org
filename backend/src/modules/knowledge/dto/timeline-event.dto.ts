import { ApiProperty } from '@nestjs/swagger';

class TimelineDocumentDto {
  @ApiProperty()
  filePath: string;

  @ApiProperty()
  fileName: string;
}

export class TimelineEventDto {
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

  @ApiProperty({ type: [String] })
  persons: string[];

  @ApiProperty({ type: TimelineDocumentDto })
  document: TimelineDocumentDto;
}
