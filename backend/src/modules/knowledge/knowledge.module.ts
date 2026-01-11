import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { KnowledgeController } from './knowledge.controller';
import { GetPersonHandler } from './queries/handlers/get-person.handler';
import { GetEventHandler } from './queries/handlers/get-event.handler';
import { SearchEverythingHandler } from './queries/handlers/search-everything.handler';
import { GetTimelineHandler } from './queries/handlers/get-timeline.handler';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';

const queryHandlers = [
  GetPersonHandler,
  GetEventHandler,
  SearchEverythingHandler,
  GetTimelineHandler,
];

@Module({
  imports: [CqrsModule],
  controllers: [KnowledgeController],
  providers: [...queryHandlers, PrismaService],
})
export class KnowledgeModule {}
