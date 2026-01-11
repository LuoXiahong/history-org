import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { GetEventQuery } from '../impl/get-event.query';
import { EventResponseDto } from '../../dto/event-response.dto';

@Injectable()
@QueryHandler(GetEventQuery)
export class GetEventHandler implements IQueryHandler<GetEventQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetEventQuery): Promise<EventResponseDto> {
    const event = await this.prisma.event.findUnique({
      where: { id: query.eventId },
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
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${query.eventId} not found`);
    }

    return {
      id: event.id,
      title: event.title,
      description: event.description ?? undefined,
      dateStart: event.dateStart ?? undefined,
      dateEnd: event.dateEnd ?? undefined,
      dateType: event.dateType ?? undefined,
      location: event.location ?? undefined,
      document: {
        id: event.document.id,
        filePath: event.document.filePath,
        fileName: event.document.fileName,
        title: event.document.title ?? undefined,
      },
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
