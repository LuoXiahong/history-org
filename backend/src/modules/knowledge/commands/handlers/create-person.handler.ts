import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { CreatePersonCommand } from '../impl/create-person.command';
import { PersonResponseDto } from '../../dto/person-response.dto';

@Injectable()
@CommandHandler(CreatePersonCommand)
export class CreatePersonHandler implements ICommandHandler<CreatePersonCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreatePersonCommand): Promise<PersonResponseDto> {
    const {
      fullName,
      firstName,
      lastName,
      title,
      birthDate,
      deathDate,
      description,
    } = command;

    // Check for duplicate by normalized name (case-insensitive)
    // Use Prisma's case-insensitive search with raw SQL
    // In PostgreSQL, table names are case-sensitive when quoted, lowercase when not quoted
    const existingPerson = (await this.prisma.$queryRaw<
      Array<{ id: string; fullName: string }>
    >`
      SELECT id, "fullName" FROM "Person" WHERE LOWER(TRIM("fullName")) = LOWER(TRIM(${fullName})) LIMIT 1
    `) as Array<{ id: string; fullName: string }>;

    if (existingPerson && existingPerson.length > 0) {
      throw new ConflictException(
        `Person with name '${fullName}' already exists (ID: ${existingPerson[0].id})`,
      );
    }

    // Create Person
    const person = await this.prisma.person.create({
      data: {
        fullName,
        firstName: firstName || null,
        lastName: lastName || null,
        title: title || null,
        birthDate: birthDate || null,
        deathDate: deathDate || null,
        description: description || null,
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
