import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CreatePersonDto } from './dto/create-person.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { PersonResponseDto } from './dto/person-response.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResultDto } from './dto/search-result.dto';
import { TimelineEventDto } from './dto/timeline-event.dto';
import { TimelineQueryDto } from './dto/timeline-query.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdatePersonDto } from './dto/update-person.dto';

interface PersonWithRelations {
  id: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  birthDate: Date | null;
  deathDate: Date | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  events: Array<{
    role: string | null;
    context: string | null;
    event: {
      id: string;
      title: string;
      dateStart: Date | null;
    };
  }>;
  documents: Array<{
    context: string | null;
    document: {
      id: string;
      filePath: string;
      fileName: string;
    };
  }>;
}

interface EventWithRelations {
  id: string;
  title: string;
  description: string | null;
  dateStart: Date | null;
  dateEnd: Date | null;
  dateType: string | null;
  location: string | null;
  createdAt: Date;
  updatedAt: Date;
  document: {
    id: string;
    filePath: string;
    fileName: string;
    title: string | null;
  } | null;
  relatedPersons: Array<{
    role: string | null;
    context: string | null;
    person: {
      id: string;
      fullName: string;
    };
  }>;
}

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Persons ---

  async createPerson(dto: CreatePersonDto): Promise<PersonResponseDto> {
    const {
      fullName,
      firstName,
      lastName,
      title,
      birthDate,
      deathDate,
      description,
    } = dto;

    // Check for duplicate by normalized name (case-insensitive)
    const existingPerson = await this.prisma.$queryRaw<
      Array<{ id: string; fullName: string }>
    >`
      SELECT id, "fullName" FROM "Person" WHERE LOWER(TRIM("fullName")) = LOWER(TRIM(${fullName})) LIMIT 1
    `;

    if (existingPerson && existingPerson.length > 0) {
      throw new ConflictException(
        `Person with name '${fullName}' already exists (ID: ${existingPerson[0].id})`,
      );
    }

    const person = await this.prisma.person.create({
      data: {
        fullName,
        firstName: firstName || null,
        lastName: lastName || null,
        title: title || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        deathDate: deathDate ? new Date(deathDate) : null,
        description: description || null,
      },
      include: this.getPersonInclude(),
    });

    return this.mapPersonToDto(person as unknown as PersonWithRelations);
  }

  async updatePerson(
    id: string,
    dto: UpdatePersonDto,
  ): Promise<PersonResponseDto> {
    const {
      fullName,
      firstName,
      lastName,
      title,
      birthDate,
      deathDate,
      description,
    } = dto;

    const existingPerson = await this.prisma.person.findUnique({
      where: { id },
    });

    if (!existingPerson) {
      throw new NotFoundException(`Person with ID ${id} not found`);
    }

    if (fullName) {
      const duplicatePerson = await this.prisma.$queryRaw<
        Array<{ id: string; fullName: string }>
      >`
        SELECT id, "fullName" FROM "Person" WHERE LOWER(TRIM("fullName")) = LOWER(TRIM(${fullName})) AND id != ${id} LIMIT 1
      `;

      if (duplicatePerson && duplicatePerson.length > 0) {
        throw new ConflictException(
          `Person with name '${fullName}' already exists (ID: ${duplicatePerson[0].id})`,
        );
      }
    }

    const person = await this.prisma.person.update({
      where: { id },
      data: {
        ...(fullName && { fullName }),
        ...(firstName !== undefined && { firstName: firstName || null }),
        ...(lastName !== undefined && { lastName: lastName || null }),
        ...(title !== undefined && { title: title || null }),
        ...(birthDate !== undefined && {
          birthDate: birthDate ? new Date(birthDate) : null,
        }),
        ...(deathDate !== undefined && {
          deathDate: deathDate ? new Date(deathDate) : null,
        }),
        ...(description !== undefined && { description: description || null }),
      },
      include: this.getPersonInclude(),
    });

    return this.mapPersonToDto(person as unknown as PersonWithRelations);
  }

  async deletePerson(id: string): Promise<void> {
    const person = await this.prisma.person.findUnique({
      where: { id },
    });

    if (!person) {
      throw new NotFoundException(`Person with ID ${id} not found`);
    }

    await this.prisma.person.delete({
      where: { id },
    });
  }

  async getPerson(id: string): Promise<PersonResponseDto> {
    const person = await this.prisma.person.findUnique({
      where: { id },
      include: this.getPersonInclude(),
    });

    if (!person) {
      throw new NotFoundException(`Person with ID ${id} not found`);
    }

    return this.mapPersonToDto(person as unknown as PersonWithRelations);
  }

  // --- Events ---

  async createEvent(dto: CreateEventDto): Promise<EventResponseDto> {
    const {
      title,
      description,
      dateStart,
      dateEnd,
      dateType,
      location,
      documentId,
    } = dto;

    if (documentId) {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new BadRequestException(
          `Document with ID '${documentId}' not found`,
        );
      }
    }

    const event = await this.prisma.event.create({
      data: {
        title,
        description: description || null,
        dateStart: dateStart ? new Date(dateStart) : null,
        dateEnd: dateEnd ? new Date(dateEnd) : null,
        dateType: dateType || null,
        location: location || null,
        documentId: documentId || null,
      },
      include: this.getEventInclude(),
    });

    return this.mapEventToDto(event as unknown as EventWithRelations);
  }

  async updateEvent(
    id: string,
    dto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    const {
      title,
      description,
      dateStart,
      dateEnd,
      dateType,
      location,
      documentId,
    } = dto;

    const existingEvent = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    if (documentId !== undefined && documentId !== null) {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new BadRequestException(
          `Document with ID '${documentId}' not found`,
        );
      }
    }

    const event = await this.prisma.event.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(dateStart !== undefined && {
          dateStart: dateStart ? new Date(dateStart) : null,
        }),
        ...(dateEnd !== undefined && {
          dateEnd: dateEnd ? new Date(dateEnd) : null,
        }),
        ...(dateType !== undefined && { dateType: dateType || null }),
        ...(location !== undefined && { location: location || null }),
        ...(documentId !== undefined && { documentId: documentId || null }),
      },
      include: this.getEventInclude(),
    });

    return this.mapEventToDto(event as unknown as EventWithRelations);
  }

  async deleteEvent(id: string): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    await this.prisma.event.delete({
      where: { id },
    });
  }

  async getEvent(id: string): Promise<EventResponseDto> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: this.getEventInclude(),
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return this.mapEventToDto(event as unknown as EventWithRelations);
  }

  // --- Search & Timeline ---

  async search(query: SearchQueryDto): Promise<SearchResultDto> {
    const searchPattern = query.q;

    const [persons, totalPersons] = await Promise.all([
      this.prisma.person.findMany({
        where: {
          OR: [
            { fullName: { contains: searchPattern } },
            { firstName: { contains: searchPattern } },
            { lastName: { contains: searchPattern } },
            { title: { contains: searchPattern } },
            { description: { contains: searchPattern } },
          ],
        },
        include: this.getPersonInclude(),
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.person.count({
        where: {
          OR: [
            { fullName: { contains: searchPattern } },
            { firstName: { contains: searchPattern } },
            { lastName: { contains: searchPattern } },
            { title: { contains: searchPattern } },
            { description: { contains: searchPattern } },
          ],
        },
      }),
    ]);

    const [events, totalEvents] = await Promise.all([
      this.prisma.event.findMany({
        where: {
          OR: [
            { title: { contains: searchPattern } },
            { description: { contains: searchPattern } },
            { location: { contains: searchPattern } },
          ],
        },
        include: this.getEventInclude(),
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.event.count({
        where: {
          OR: [
            { title: { contains: searchPattern } },
            { description: { contains: searchPattern } },
            { location: { contains: searchPattern } },
          ],
        },
      }),
    ]);

    return {
      persons: persons.map((p) =>
        this.mapPersonToDto(p as unknown as PersonWithRelations),
      ),
      events: events.map((e) =>
        this.mapEventToDto(e as unknown as EventWithRelations),
      ),
      totalPersons,
      totalEvents,
    };
  }

  async getTimeline(query: TimelineQueryDto): Promise<TimelineEventDto[]> {
    const dateStartFilter =
      query.dateStart || query.dateEnd
        ? {
            ...(query.dateStart && { gte: query.dateStart }),
            ...(query.dateEnd && { lte: query.dateEnd }),
          }
        : undefined;

    const events = await this.prisma.event.findMany({
      where: dateStartFilter ? { dateStart: dateStartFilter } : {},
      include: this.getEventInclude(),
      orderBy: {
        dateStart: 'asc',
      },
      take: query.limit,
      skip: query.offset,
    });

    return events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description ?? undefined,
      dateStart: event.dateStart ?? undefined,
      dateEnd: event.dateEnd ?? undefined,
      dateType: event.dateType ?? undefined,
      location: event.location ?? undefined,
      persons: event.relatedPersons.map(
        (personEvent) => personEvent.person.fullName,
      ),
      document: event.document
        ? {
            filePath: event.document.filePath,
            fileName: event.document.fileName,
          }
        : {
            filePath: '',
            fileName: 'Manual Entry',
          },
    }));
  }

  // --- Helpers ---

  private getPersonInclude() {
    return {
      events: {
        include: {
          event: {
            select: {
              id: true,
              title: true,
              dateStart: true,
            },
          },
        },
      },
      documents: {
        include: {
          document: {
            select: {
              id: true,
              filePath: true,
              fileName: true,
            },
          },
        },
      },
    };
  }

  private getEventInclude() {
    return {
      document: {
        select: {
          id: true,
          filePath: true,
          fileName: true,
          title: true,
        },
      },
      relatedPersons: {
        include: {
          person: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      },
    };
  }

  private mapPersonToDto(person: PersonWithRelations): PersonResponseDto {
    return {
      id: person.id,
      fullName: person.fullName,
      firstName: person.firstName ?? undefined,
      lastName: person.lastName ?? undefined,
      title: person.title ?? undefined,
      birthDate: person.birthDate ?? undefined,
      deathDate: person.deathDate ?? undefined,
      description: person.description ?? undefined,
      events: person.events.map((personEvent) => ({
        id: personEvent.event.id,
        title: personEvent.event.title,
        dateStart: personEvent.event.dateStart ?? undefined,
        role: personEvent.role ?? undefined,
        context: personEvent.context ?? undefined,
      })),
      documents: person.documents.map((personDocument) => ({
        id: personDocument.document.id,
        filePath: personDocument.document.filePath,
        fileName: personDocument.document.fileName,
        context: personDocument.context ?? undefined,
      })),
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    };
  }

  private mapEventToDto(event: EventWithRelations): EventResponseDto {
    return {
      id: event.id,
      title: event.title,
      description: event.description ?? undefined,
      dateStart: event.dateStart ?? undefined,
      dateEnd: event.dateEnd ?? undefined,
      dateType: event.dateType ?? undefined,
      location: event.location ?? undefined,
      document: event.document
        ? {
            id: event.document.id,
            filePath: event.document.filePath,
            fileName: event.document.fileName,
            title: event.document.title ?? undefined,
          }
        : undefined,
      persons: event.relatedPersons.map((personEvent) => ({
        id: personEvent.person.id,
        fullName: personEvent.person.fullName,
        role: personEvent.role ?? undefined,
        context: personEvent.context ?? undefined,
      })),
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}
