import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../../../shared/infrastructure/database/prisma.service';
import { CreatePersonHandler } from '../create-person.handler';
import { CreatePersonCommand } from '../../impl/create-person.command';

describe('CreatePersonHandler', () => {
  let handler: CreatePersonHandler;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [CreatePersonHandler, PrismaService],
    }).compile();

    handler = module.get<CreatePersonHandler>(CreatePersonHandler);
    prisma = module.get<PrismaService>(PrismaService);

    // Clean up test data
    await prisma.personEvent.deleteMany({});
    await prisma.personDocument.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.person.deleteMany({});
    await prisma.document.deleteMany({});
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

  it('should create a person when valid data provided', async () => {
    const command = new CreatePersonCommand(
      'Napoleon Bonaparte',
      'Napoleon',
      'Bonaparte',
      'Emperor',
      new Date('1769-08-15'),
      new Date('1821-05-05'),
      'French military and political leader',
    );

    const result = await handler.execute(command);

    expect(result).toBeDefined();
    expect(result.fullName).toBe('Napoleon Bonaparte');
    expect(result.firstName).toBe('Napoleon');
    expect(result.lastName).toBe('Bonaparte');
    expect(result.title).toBe('Emperor');
    expect(result.birthDate).toBeDefined();
    expect(result.deathDate).toBeDefined();
    expect(result.description).toBe('French military and political leader');
    expect(result.id).toBeDefined();
    expect(result.events).toEqual([]);
    expect(result.documents).toEqual([]);
  });

  it('should create a person with minimal data', async () => {
    const command = new CreatePersonCommand('John Doe');

    const result = await handler.execute(command);

    expect(result).toBeDefined();
    expect(result.fullName).toBe('John Doe');
    expect(result.firstName).toBeUndefined();
    expect(result.lastName).toBeUndefined();
    expect(result.title).toBeUndefined();
    expect(result.birthDate).toBeUndefined();
    expect(result.deathDate).toBeUndefined();
    expect(result.description).toBeUndefined();
  });

  it('should reject duplicate person names (case-insensitive)', async () => {
    // Create first person
    const command1 = new CreatePersonCommand('Napoleon Bonaparte');
    await handler.execute(command1);

    // Try to create duplicate with different case
    const command2 = new CreatePersonCommand('napoleon bonaparte');

    await expect(handler.execute(command2)).rejects.toThrow(ConflictException);
    await expect(handler.execute(command2)).rejects.toThrow(
      "Person with name 'napoleon bonaparte' already exists",
    );
  });

  it('should reject duplicate person names with whitespace differences', async () => {
    // Create first person
    const command1 = new CreatePersonCommand('Napoleon Bonaparte');
    await handler.execute(command1);

    // Try to create duplicate with whitespace
    const command2 = new CreatePersonCommand('  Napoleon Bonaparte  ');

    await expect(handler.execute(command2)).rejects.toThrow(ConflictException);
  });

  it('should handle optional fields correctly', async () => {
    const command = new CreatePersonCommand(
      'Test Person',
      undefined,
      undefined,
      'Title',
      undefined,
      undefined,
      'Description',
    );

    const result = await handler.execute(command);

    expect(result.fullName).toBe('Test Person');
    expect(result.firstName).toBeUndefined();
    expect(result.lastName).toBeUndefined();
    expect(result.title).toBe('Title');
    expect(result.birthDate).toBeUndefined();
    expect(result.deathDate).toBeUndefined();
    expect(result.description).toBe('Description');
  });
});
