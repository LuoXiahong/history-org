import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../../shared/infrastructure/database/prisma.service';
import { DeletePersonHandler } from '../delete-person.handler';
import { DeletePersonCommand } from '../../impl/delete-person.command';

describe('DeletePersonHandler', () => {
  let handler: DeletePersonHandler;
  let prisma: PrismaService;
  let testPersonId: string;
  let testEventId: string;
  let testDocumentId: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [DeletePersonHandler, PrismaService],
    }).compile();

    handler = module.get<DeletePersonHandler>(DeletePersonHandler);
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
        firstName: 'Test',
        lastName: 'Person',
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

    // Create relationships
    await prisma.personEvent.create({
      data: {
        personId: testPersonId,
        eventId: testEventId,
      },
    });

    await prisma.personDocument.create({
      data: {
        personId: testPersonId,
        documentId: testDocumentId,
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

  it('should delete person when person exists', async () => {
    const command = new DeletePersonCommand(testPersonId);

    await handler.execute(command);

    // Verify person is deleted
    const person = await prisma.person.findUnique({
      where: { id: testPersonId },
    });
    expect(person).toBeNull();

    // Verify cascade deletes relationships
    const personEvents = await prisma.personEvent.findMany({
      where: { personId: testPersonId },
    });
    expect(personEvents).toHaveLength(0);

    const personDocuments = await prisma.personDocument.findMany({
      where: { personId: testPersonId },
    });
    expect(personDocuments).toHaveLength(0);
  });

  it('should throw NotFoundException when person not found', async () => {
    const command = new DeletePersonCommand('non-existent-id');

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(command)).rejects.toThrow(
      'Person with ID non-existent-id not found',
    );
  });

  it('should cascade delete PersonEvent relationships', async () => {
    // Verify relationship exists before deletion
    const personEventBefore = await prisma.personEvent.findFirst({
      where: { personId: testPersonId },
    });
    expect(personEventBefore).toBeDefined();

    const command = new DeletePersonCommand(testPersonId);
    await handler.execute(command);

    // Verify relationship is deleted
    const personEventAfter = await prisma.personEvent.findFirst({
      where: { personId: testPersonId },
    });
    expect(personEventAfter).toBeNull();
  });

  it('should cascade delete PersonDocument relationships', async () => {
    // Verify relationship exists before deletion
    const personDocumentBefore = await prisma.personDocument.findFirst({
      where: { personId: testPersonId },
    });
    expect(personDocumentBefore).toBeDefined();

    const command = new DeletePersonCommand(testPersonId);
    await handler.execute(command);

    // Verify relationship is deleted
    const personDocumentAfter = await prisma.personDocument.findFirst({
      where: { personId: testPersonId },
    });
    expect(personDocumentAfter).toBeNull();
  });
});
