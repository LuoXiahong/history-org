import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DeleteEventCommand } from '../impl/delete-event.command';

@Injectable()
@CommandHandler(DeleteEventCommand)
export class DeleteEventHandler
  implements ICommandHandler<DeleteEventCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteEventCommand): Promise<void> {
    const { eventId } = command;

    // Verify Event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Delete Event (cascade deletes PersonEvent relationships)
    await this.prisma.event.delete({
      where: { id: eventId },
    });
  }
}
