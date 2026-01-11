import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DeletePersonCommand } from '../impl/delete-person.command';

@Injectable()
@CommandHandler(DeletePersonCommand)
export class DeletePersonHandler
  implements ICommandHandler<DeletePersonCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeletePersonCommand): Promise<void> {
    const { personId } = command;

    // Verify Person exists
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
    });

    if (!person) {
      throw new NotFoundException(`Person with ID ${personId} not found`);
    }

    // Delete Person (cascade deletes PersonDocument and PersonEvent relationships)
    await this.prisma.person.delete({
      where: { id: personId },
    });
  }
}
