import { ApiProperty } from '@nestjs/swagger';
import { PersonResponseDto } from './person-response.dto';
import { EventResponseDto } from './event-response.dto';

export class SearchResultDto {
  @ApiProperty({ type: [PersonResponseDto] })
  persons: PersonResponseDto[];

  @ApiProperty({ type: [EventResponseDto] })
  events: EventResponseDto[];

  @ApiProperty()
  totalPersons: number;

  @ApiProperty()
  totalEvents: number;
}
