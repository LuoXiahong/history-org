import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { SearchEverythingQuery } from '../impl/search-everything.query';
import { SearchResultDto } from '../../dto/search-result.dto';
import { PersonResponseDto } from '../../dto/person-response.dto';
import { EventResponseDto } from '../../dto/event-response.dto';

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
@QueryHandler(SearchEverythingQuery)
export class SearchEverythingHandler implements IQueryHandler<SearchEverythingQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: SearchEverythingQuery): Promise<SearchResultDto> {
    // SQLite LIKE is case-insensitive by default
    // Use contains for pattern matching
    const searchPattern = query.query;

    // Search Persons
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
        include: {
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
        },
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

    // Search Events
    const [events, totalEvents] = await Promise.all([
      this.prisma.event.findMany({
        where: {
          OR: [
            { title: { contains: searchPattern } },
            { description: { contains: searchPattern } },
            { location: { contains: searchPattern } },
          ],
        },
        include: {
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
        },
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
      persons: persons.map((person) => this.mapPersonToDto(person)),
      events: events.map((event) => this.mapEventToDto(event)),
      totalPersons,
      totalEvents,
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
