import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { CreateEventCommand } from '../impl/create-event.command';
import { EventResponseDto } from '../../dto/event-response.dto';

@Injectable()
@CommandHandler(CreateEventCommand)
export class CreateEventHandler
  implements ICommandHandler<CreateEventCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateEventCommand): Promise<EventResponseDto> {
    const {
      title,
      description,
      dateStart,
      dateEnd,
      dateType,
      location,
      documentId,
    } = command;

    // If documentId provided, verify Document exists
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

    // Create Event
    const event = await this.prisma.event.create({
      data: {
        title,
        description: description || null,
        dateStart: dateStart || null,
        dateEnd: dateEnd || null,
        dateType: dateType || null,
        location: location || null,
        documentId: documentId || null,
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
    });

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
