import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../../shared/infrastructure/database/prisma.service';
import { DeleteEventHandler } from '../delete-event.handler';
import { DeleteEventCommand } from '../../impl/delete-event.command';

describe('DeleteEventHandler', () => {
  let handler: DeleteEventHandler;
  let prisma: PrismaService;
  let testEventId: string;
  let testPersonId: string;
  let testDocumentId: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [DeleteEventHandler, PrismaService],
    }).compile();

    handler = module.get<DeleteEventHandler>(DeleteEventHandler);
    prisma = module.get<PrismaService>(PrismaService);

    // Clean up test data
    await prisma.personEvent.deleteMany({});
    await prisma.personDocument.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.person.deleteMany({});
    await prisma.document.deleteMany({});

    // Create test data
    const uniqueId = Date.now().toString();
    const document = await prisma.document.create({
      data: {
        filePath: `test-doc-${uniqueId}.md`,
        fileName: `test-doc-${uniqueId}.md`,
        contentHash: `test-hash-${uniqueId}`,
        lastModified: new Date(),
      },
    });
    testDocumentId = document.id;

    const person = await prisma.person.create({
      data: {
        fullName: 'Test Person',
      },
    });
    testPersonId = person.id;

    const event = await prisma.event.create({
      data: {
        title: 'Test Event',
        documentId: testDocumentId,
      },
    });
    testEventId = event.id;

    // Create relationship
    await prisma.personEvent.create({
      data: {
        personId: testPersonId,
        eventId: testEventId,
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.personEvent.deleteMany({});
    await prisma.personDocument.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.person.deleteMany({});
    await prisma.document.deleteMany({});
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should delete event when event exists', async () => {
    const command = new DeleteEventCommand(testEventId);

    await handler.execute(command);

    // Verify event is deleted
    const event = await prisma.event.findUnique({
      where: { id: testEventId },
    });
    expect(event).toBeNull();
  });

  it('should throw NotFoundException when event not found', async () => {
    const command = new DeleteEventCommand('non-existent-id');

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(command)).rejects.toThrow(
      'Event with ID non-existent-id not found',
    );
  });

  it('should cascade delete PersonEvent relationships', async () => {
    // Verify relationship exists before deletion
    const personEventBefore = await prisma.personEvent.findFirst({
      where: { eventId: testEventId },
    });
    expect(personEventBefore).toBeDefined();

    const command = new DeleteEventCommand(testEventId);
    await handler.execute(command);

    // Verify relationship is deleted
    const personEventAfter = await prisma.personEvent.findFirst({
      where: { eventId: testEventId },
    });
    expect(personEventAfter).toBeNull();
  });
});
