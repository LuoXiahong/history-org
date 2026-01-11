import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { OpenAIExtractorService } from '../../domain/openai-extractor.service';
import { ExtractEntitiesCommand } from '../impl/extract-entities.command';
import { EntitiesExtractedEvent } from '../../events/impl/entities-extracted.event';

@Injectable()
@CommandHandler(ExtractEntitiesCommand)
export class ExtractEntitiesHandler implements ICommandHandler<ExtractEntitiesCommand> {
  private readonly logger = new Logger(ExtractEntitiesHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly extractor: OpenAIExtractorService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ExtractEntitiesCommand): Promise<void> {
    const { documentId, content } = command;

    this.logger.log(`Starting extraction for document ${documentId}`);

    try {
      const extractionResult = await this.extractor.extractEntities(content);

      await this.prisma.$transaction(async (tx) => {
        // Process Persons
        const personMap = new Map<string, string>(); // fullName -> personId
        let personCount = 0;

        for (const personData of extractionResult.persons) {
          // Find or create Person
          let person = await tx.person.findFirst({
            where: { fullName: personData.fullName },
          });

          if (!person) {
            person = await tx.person.create({
              data: {
                fullName: personData.fullName,
                firstName: personData.firstName || null,
                lastName: personData.lastName || null,
                title: personData.title || null,
                birthDate: personData.birthDate
                  ? new Date(personData.birthDate)
                  : null,
                deathDate: personData.deathDate
                  ? new Date(personData.deathDate)
                  : null,
                description: personData.description || null,
              },
            });
            personCount++;
          }

          personMap.set(personData.fullName, person.id);

          // Create PersonDocument relationship if not exists
          const existingRelation = await tx.personDocument.findUnique({
            where: {
              personId_documentId: {
                personId: person.id,
                documentId,
              },
            },
          });

          if (!existingRelation) {
            await tx.personDocument.create({
              data: {
                personId: person.id,
                documentId,
                context: personData.description || null,
              },
            });
          }
        }

        // Process Events
        let eventCount = 0;

        for (const eventData of extractionResult.events) {
          const event = await tx.event.create({
            data: {
              documentId,
              title: eventData.title,
              description: eventData.description || null,
              dateStart: eventData.dateStart
                ? new Date(eventData.dateStart)
                : null,
              dateEnd: eventData.dateEnd ? new Date(eventData.dateEnd) : null,
              dateType: eventData.dateType || null,
              location: eventData.location || null,
            },
          });

          eventCount++;

          // Create PersonEvent relationships
          if (eventData.relatedPersonNames) {
            for (const personName of eventData.relatedPersonNames) {
              const personId = personMap.get(personName);
              if (personId) {
                const existingRelation = await tx.personEvent.findUnique({
                  where: {
                    personId_eventId: {
                      personId,
                      eventId: event.id,
                    },
                  },
                });

                if (!existingRelation) {
                  await tx.personEvent.create({
                    data: {
                      personId,
                      eventId: event.id,
                      context: eventData.description || null,
                    },
                  });
                }
              }
            }
          }
        }

        // Emit event with counts
        this.eventBus.publish(
          new EntitiesExtractedEvent(documentId, personCount, eventCount),
        );

        this.logger.log(
          `Extraction completed for document ${documentId}: ${personCount} persons, ${eventCount} events`,
        );
      });
    } catch (error) {
      this.logger.error(
        `Extraction failed for document ${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
