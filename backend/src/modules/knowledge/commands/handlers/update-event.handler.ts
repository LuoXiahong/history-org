import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { UpdateEventCommand } from '../impl/update-event.command';
import { EventResponseDto } from '../../dto/event-response.dto';

@Injectable()
@CommandHandler(UpdateEventCommand)
export class UpdateEventHandler
  implements ICommandHandler<UpdateEventCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdateEventCommand): Promise<EventResponseDto> {
    const {
      eventId,
      title,
      description,
      dateStart,
      dateEnd,
      dateType,
      location,
      documentId,
    } = command;

    // Verify Event exists
    const existingEvent = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!existingEvent) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // If documentId provided, verify Document exists
    if (documentId !== undefined) {
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
    }

    // Update Event
    const event = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(dateStart !== undefined && { dateStart: dateStart || null }),
        ...(dateEnd !== undefined && { dateEnd: dateEnd || null }),
        ...(dateType !== undefined && { dateType: dateType || null }),
        ...(location !== undefined && { location: location || null }),
        ...(documentId !== undefined && { documentId: documentId || null }),
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
