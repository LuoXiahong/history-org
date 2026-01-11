import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { GetPersonQuery } from './queries/impl/get-person.query';
import { GetEventQuery } from './queries/impl/get-event.query';
import { SearchEverythingQuery } from './queries/impl/search-everything.query';
import { GetTimelineQuery } from './queries/impl/get-timeline.query';
import { PersonResponseDto } from './dto/person-response.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { SearchResultDto } from './dto/search-result.dto';
import { TimelineEventDto } from './dto/timeline-event.dto';

@ApiTags('knowledge')
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('persons/:id')
  @ApiOperation({
    summary: 'Get a person by ID with related events and documents',
  })
  @ApiParam({ name: 'id', description: 'Person ID' })
  @ApiResponse({
    status: 200,
    description: 'Person found',
    type: PersonResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Person not found',
  })
  async getPerson(@Param('id') id: string): Promise<PersonResponseDto> {
    const query = new GetPersonQuery(id);
    return await this.queryBus.execute(query);
  }

  @Get('events/:id')
  @ApiOperation({
    summary: 'Get an event by ID with related persons and document',
  })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event found',
    type: EventResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found',
  })
  async getEvent(@Param('id') id: string): Promise<EventResponseDto> {
    const query = new GetEventQuery(id);
    return await this.queryBus.execute(query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search across persons and events' })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  @ApiQuery({
    name: 'limit',
    description: 'Limit results',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Offset for pagination',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    type: SearchResultDto,
  })
  async search(
    @Query('q') q: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<SearchResultDto> {
    const query = new SearchEverythingQuery(q, limit, offset);
    return await this.queryBus.execute(query);
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Get timeline of events within a date range' })
  @ApiQuery({
    name: 'dateStart',
    description: 'Start date (ISO 8601)',
    required: false,
  })
  @ApiQuery({
    name: 'dateEnd',
    description: 'End date (ISO 8601)',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Limit results',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Offset for pagination',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Timeline events',
    type: [TimelineEventDto],
  })
  async getTimeline(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('dateStart') dateStart?: string,
    @Query('dateEnd') dateEnd?: string,
  ): Promise<TimelineEventDto[]> {
    const query = new GetTimelineQuery(
      dateStart ? new Date(dateStart) : undefined,
      dateEnd ? new Date(dateEnd) : undefined,
      limit,
      offset,
    );
    return await this.queryBus.execute(query);
  }
}
