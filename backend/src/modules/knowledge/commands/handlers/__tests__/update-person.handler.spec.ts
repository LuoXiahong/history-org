import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../../../shared/infrastructure/database/prisma.service';
import { UpdatePersonHandler } from '../update-person.handler';
import { UpdatePersonCommand } from '../../impl/update-person.command';

describe('UpdatePersonHandler', () => {
  let handler: UpdatePersonHandler;
  let prisma: PrismaService;
  let testPersonId: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [UpdatePersonHandler, PrismaService],
    }).compile();

    handler = module.get<UpdatePersonHandler>(UpdatePersonHandler);
    prisma = module.get<PrismaService>(PrismaService);

    // Clean up test data
    await prisma.personEvent.deleteMany({});
    await prisma.personDocument.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.person.deleteMany({});
    await prisma.document.deleteMany({});

    // Create test persons
    const person1 = await prisma.person.create({
      data: {
        fullName: 'Original Name',
        firstName: 'Original',
        lastName: 'Name',
        title: 'Original Title',
      },
    });
    testPersonId = person1.id;

    await prisma.person.create({
      data: {
        fullName: 'Another Person',
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

  it('should update person when valid data provided', async () => {
    const command = new UpdatePersonCommand(
      testPersonId,
      'Updated Name',
      'Updated',
      'Name',
      'Updated Title',
      new Date('1900-01-01'),
      new Date('2000-01-01'),
      'Updated description',
    );

    const result = await handler.execute(command);

    expect(result).toBeDefined();
    expect(result.id).toBe(testPersonId);
    expect(result.fullName).toBe('Updated Name');
    expect(result.firstName).toBe('Updated');
    expect(result.lastName).toBe('Name');
    expect(result.title).toBe('Updated Title');
    expect(result.birthDate).toBeDefined();
    expect(result.deathDate).toBeDefined();
    expect(result.description).toBe('Updated description');
  });

  it('should update partial fields', async () => {
    const command = new UpdatePersonCommand(
      testPersonId,
      undefined,
      'New First Name',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const result = await handler.execute(command);

    expect(result.id).toBe(testPersonId);
    expect(result.fullName).toBe('Original Name'); // Unchanged
    expect(result.firstName).toBe('New First Name');
    expect(result.lastName).toBe('Name'); // Unchanged
  });

  it('should throw NotFoundException when person not found', async () => {
    const command = new UpdatePersonCommand('non-existent-id', 'New Name');

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(command)).rejects.toThrow(
      'Person with ID non-existent-id not found',
    );
  });

  it('should reject duplicate names when updating fullName', async () => {
    const command = new UpdatePersonCommand(
      testPersonId,
      'Another Person', // Same as person2
    );

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
    await expect(handler.execute(command)).rejects.toThrow(
      "Person with name 'Another Person' already exists",
    );
  });

  it('should allow updating to same name (no conflict)', async () => {
    const command = new UpdatePersonCommand(
      testPersonId,
      'Original Name', // Same name
      'Updated First',
    );

    const result = await handler.execute(command);

    expect(result.fullName).toBe('Original Name');
    expect(result.firstName).toBe('Updated First');
  });

  it('should clear optional fields when set to undefined', async () => {
    const command = new UpdatePersonCommand(
      testPersonId,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      '', // Empty string should be treated as null
    );

    const result = await handler.execute(command);

    expect(result.description).toBeUndefined();
  });
});
