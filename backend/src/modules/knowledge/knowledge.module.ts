import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { PersonEnrichmentService } from './domain/person-enrichment.service';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';

@Module({
  imports: [ConfigModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, PrismaService, PersonEnrichmentService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
