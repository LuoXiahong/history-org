import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { KnowledgeController } from './knowledge.controller';
import { GetPersonHandler } from './queries/handlers/get-person.handler';
import { GetEventHandler } from './queries/handlers/get-event.handler';
import { SearchEverythingHandler } from './queries/handlers/search-everything.handler';
import { GetTimelineHandler } from './queries/handlers/get-timeline.handler';
import { CreatePersonHandler } from './commands/handlers/create-person.handler';
import { UpdatePersonHandler } from './commands/handlers/update-person.handler';
import { DeletePersonHandler } from './commands/handlers/delete-person.handler';
import { CreateEventHandler } from './commands/handlers/create-event.handler';
import { UpdateEventHandler } from './commands/handlers/update-event.handler';
import { DeleteEventHandler } from './commands/handlers/delete-event.handler';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { PersonEnrichmentService } from './domain/person-enrichment.service';

const queryHandlers = [
  GetPersonHandler,
  GetEventHandler,
  SearchEverythingHandler,
  GetTimelineHandler,
];

const commandHandlers = [
  CreatePersonHandler,
  UpdatePersonHandler,
  DeletePersonHandler,
  CreateEventHandler,
  UpdateEventHandler,
  DeleteEventHandler,
];

@Module({
  imports: [CqrsModule, ConfigModule],
  controllers: [KnowledgeController],
  providers: [
    ...queryHandlers,
    ...commandHandlers,
    PrismaService,
    PersonEnrichmentService,
  ],
})
export class KnowledgeModule {}
