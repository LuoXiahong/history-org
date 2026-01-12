import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { GetPersonQuery } from './queries/impl/get-person.query';
import { GetEventQuery } from './queries/impl/get-event.query';
import { SearchEverythingQuery } from './queries/impl/search-everything.query';
import { GetTimelineQuery } from './queries/impl/get-timeline.query';
import { CreatePersonCommand } from './commands/impl/create-person.command';
import { UpdatePersonCommand } from './commands/impl/update-person.command';
import { DeletePersonCommand } from './commands/impl/delete-person.command';
import { CreateEventCommand } from './commands/impl/create-event.command';
import { UpdateEventCommand } from './commands/impl/update-event.command';
import { DeleteEventCommand } from './commands/impl/delete-event.command';
import { PersonResponseDto } from './dto/person-response.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { SearchResultDto } from './dto/search-result.dto';
import { TimelineEventDto } from './dto/timeline-event.dto';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EnrichedPersonDto } from './dto/enriched-person.dto';
import { EnrichPersonRequestDto } from './dto/enrich-person-request.dto';
import { PersonEnrichmentService } from './domain/person-enrichment.service';

@ApiTags('knowledge')
@Controller('knowledge')
export class KnowledgeController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
    private readonly enrichmentService: PersonEnrichmentService,
  ) {}

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

  @Post('enrich-person')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enrich person data using AI' })
  @ApiBody({ type: EnrichPersonRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Person data enriched',
    type: EnrichedPersonDto,
  })
  async enrichPerson(
    @Body() dto: EnrichPersonRequestDto,
  ): Promise<EnrichedPersonDto> {
    return await this.enrichmentService.enrichPerson(dto.name);
  }

  @Post('persons')
  @ApiOperation({ summary: 'Create a new person' })
  @ApiBody({ type: CreatePersonDto })
  @ApiResponse({
    status: 201,
    description: 'Person created successfully',
    type: PersonResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Person with this name already exists',
  })
  async createPerson(@Body() dto: CreatePersonDto): Promise<PersonResponseDto> {
    const command = new CreatePersonCommand(
      dto.fullName,
      dto.firstName,
      dto.lastName,
      dto.title,
      dto.birthDate ? new Date(dto.birthDate) : undefined,
      dto.deathDate ? new Date(dto.deathDate) : undefined,
      dto.description,
    );
    return await this.commandBus.execute(command);
  }

  @Put('persons/:id')
  @ApiOperation({ summary: 'Update an existing person' })
  @ApiParam({ name: 'id', description: 'Person ID' })
  @ApiBody({ type: UpdatePersonDto })
  @ApiResponse({
    status: 200,
    description: 'Person updated successfully',
    type: PersonResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Person not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Person with this name already exists',
  })
  async updatePerson(
    @Param('id') id: string,
    @Body() dto: UpdatePersonDto,
  ): Promise<PersonResponseDto> {
    const command = new UpdatePersonCommand(
      id,
      dto.fullName,
      dto.firstName,
      dto.lastName,
      dto.title,
      dto.birthDate ? new Date(dto.birthDate) : undefined,
      dto.deathDate ? new Date(dto.deathDate) : undefined,
      dto.description,
    );
    return await this.commandBus.execute(command);
  }

  @Delete('persons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a person' })
  @ApiParam({ name: 'id', description: 'Person ID' })
  @ApiResponse({
    status: 204,
    description: 'Person deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Person not found',
  })
  async deletePerson(@Param('id') id: string): Promise<void> {
    const command = new DeletePersonCommand(id);
    await this.commandBus.execute(command);
  }

  @Post('events')
  @ApiOperation({ summary: 'Create a new event' })
  @ApiBody({ type: CreateEventDto })
  @ApiResponse({
    status: 201,
    description: 'Event created successfully',
    type: EventResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid document ID',
  })
  async createEvent(@Body() dto: CreateEventDto): Promise<EventResponseDto> {
    const command = new CreateEventCommand(
      dto.title,
      dto.description,
      dto.dateStart ? new Date(dto.dateStart) : undefined,
      dto.dateEnd ? new Date(dto.dateEnd) : undefined,
      dto.dateType,
      dto.location,
      dto.documentId,
    );
    return await this.commandBus.execute(command);
  }

  @Put('events/:id')
  @ApiOperation({ summary: 'Update an existing event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiBody({ type: UpdateEventDto })
  @ApiResponse({
    status: 200,
    description: 'Event updated successfully',
    type: EventResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid document ID',
  })
  async updateEvent(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    const command = new UpdateEventCommand(
      id,
      dto.title,
      dto.description,
      dto.dateStart ? new Date(dto.dateStart) : undefined,
      dto.dateEnd ? new Date(dto.dateEnd) : undefined,
      dto.dateType,
      dto.location,
      dto.documentId,
    );
    return await this.commandBus.execute(command);
  }

  @Delete('events/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 204,
    description: 'Event deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found',
  })
  async deleteEvent(@Param('id') id: string): Promise<void> {
    const command = new DeleteEventCommand(id);
    await this.commandBus.execute(command);
  }
}
