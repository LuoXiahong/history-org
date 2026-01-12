import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { UpdatePersonCommand } from '../impl/update-person.command';
import { PersonResponseDto } from '../../dto/person-response.dto';

@Injectable()
@CommandHandler(UpdatePersonCommand)
export class UpdatePersonHandler implements ICommandHandler<UpdatePersonCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdatePersonCommand): Promise<PersonResponseDto> {
    const {
      personId,
      fullName,
      firstName,
      lastName,
      title,
      birthDate,
      deathDate,
      description,
    } = command;

    // Verify Person exists
    const existingPerson = await this.prisma.person.findUnique({
      where: { id: personId },
    });

    if (!existingPerson) {
      throw new NotFoundException(`Person with ID ${personId} not found`);
    }

    // If fullName is being updated, check for duplicates (excluding current Person)
    if (fullName) {
      const duplicatePerson = (await this.prisma.$queryRaw<
        Array<{ id: string; fullName: string }>
      >`
        SELECT id, fullName FROM Person WHERE LOWER(TRIM(fullName)) = LOWER(${fullName}) AND id != ${personId} LIMIT 1
      `) as Array<{ id: string; fullName: string }>;

      if (duplicatePerson && duplicatePerson.length > 0) {
        throw new ConflictException(
          `Person with name '${fullName}' already exists (ID: ${duplicatePerson[0].id})`,
        );
      }
    }

    // Update Person
    const person = await this.prisma.person.update({
      where: { id: personId },
      data: {
        ...(fullName && { fullName }),
        ...(firstName !== undefined && { firstName: firstName || null }),
        ...(lastName !== undefined && { lastName: lastName || null }),
        ...(title !== undefined && { title: title || null }),
        ...(birthDate !== undefined && { birthDate: birthDate || null }),
        ...(deathDate !== undefined && { deathDate: deathDate || null }),
        ...(description !== undefined && { description: description || null }),
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
    });

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
}
