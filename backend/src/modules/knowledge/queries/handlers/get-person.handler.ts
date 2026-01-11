import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { GetPersonQuery } from '../impl/get-person.query';
import { PersonResponseDto } from '../../dto/person-response.dto';

@Injectable()
@QueryHandler(GetPersonQuery)
export class GetPersonHandler implements IQueryHandler<GetPersonQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetPersonQuery): Promise<PersonResponseDto> {
    const person = await this.prisma.person.findUnique({
      where: { id: query.personId },
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

    if (!person) {
      throw new NotFoundException(`Person with ID ${query.personId} not found`);
    }

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
