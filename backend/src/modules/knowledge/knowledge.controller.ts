import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PersonEnrichmentService } from './domain/person-enrichment.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CreatePersonDto } from './dto/create-person.dto';
import { EnrichPersonRequestDto } from './dto/enrich-person-request.dto';
import { EnrichedPersonDto } from './dto/enriched-person.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { PersonResponseDto } from './dto/person-response.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResultDto } from './dto/search-result.dto';
import { TimelineEventDto } from './dto/timeline-event.dto';
import { TimelineQueryDto } from './dto/timeline-query.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { KnowledgeService } from './knowledge.service';

@ApiTags('knowledge')
@Controller('knowledge')
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
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
    return await this.knowledgeService.getPerson(id);
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
    return await this.knowledgeService.getEvent(id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search across persons and events' })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    type: SearchResultDto,
  })
  async search(@Query() query: SearchQueryDto): Promise<SearchResultDto> {
    return await this.knowledgeService.search(query);
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Get timeline of events within a date range' })
  @ApiResponse({
    status: 200,
    description: 'Timeline events',
    type: [TimelineEventDto],
  })
  async getTimeline(
    @Query() query: TimelineQueryDto,
  ): Promise<TimelineEventDto[]> {
    return await this.knowledgeService.getTimeline(query);
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
    return await this.knowledgeService.createPerson(dto);
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
    return await this.knowledgeService.updatePerson(id, dto);
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
    await this.knowledgeService.deletePerson(id);
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
    return await this.knowledgeService.createEvent(dto);
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
    return await this.knowledgeService.updateEvent(id, dto);
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
    await this.knowledgeService.deleteEvent(id);
  }
}
