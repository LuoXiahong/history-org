import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { GetTimelineQuery } from '../impl/get-timeline.query';
import { TimelineEventDto } from '../../dto/timeline-event.dto';

@Injectable()
@QueryHandler(GetTimelineQuery)
export class GetTimelineHandler implements IQueryHandler<GetTimelineQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetTimelineQuery): Promise<TimelineEventDto[]> {
    const where: any = {};

    if (query.dateStart || query.dateEnd) {
      where.dateStart = {};
      if (query.dateStart) {
        where.dateStart.gte = query.dateStart;
      }
      if (query.dateEnd) {
        where.dateStart.lte = query.dateEnd;
      }
    }

    const events = await this.prisma.event.findMany({
      where,
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
}
