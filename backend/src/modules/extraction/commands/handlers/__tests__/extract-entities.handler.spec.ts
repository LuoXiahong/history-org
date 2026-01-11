import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, EventBus } from '@nestjs/cqrs';
import { PrismaService } from '../../../../../shared/infrastructure/database/prisma.service';
import { OpenAIExtractorService } from '../../../domain/openai-extractor.service';
import { ExtractEntitiesHandler } from '../extract-entities.handler';
import { ExtractEntitiesCommand } from '../../impl/extract-entities.command';
import { EntitiesExtractedEvent } from '../../../events/impl/entities-extracted.event';

describe('ExtractEntitiesHandler', () => {
  let handler: ExtractEntitiesHandler;
  let prisma: PrismaService;
  let extractor: OpenAIExtractorService;
  let eventBus: EventBus;

  const mockPrismaService = {
    $transaction: jest.fn(),
    person: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    event: {
      create: jest.fn(),
    },
    personDocument: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    personEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockExtractorService = {
    extractEntities: jest.fn(),
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        ExtractEntitiesHandler,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: OpenAIExtractorService,
          useValue: mockExtractorService,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    handler = module.get<ExtractEntitiesHandler>(ExtractEntitiesHandler);
    prisma = module.get<PrismaService>(PrismaService);
    extractor = module.get<OpenAIExtractorService>(OpenAIExtractorService);
    eventBus = module.get<EventBus>(EventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should extract and save entities successfully', async () => {
    const documentId = 'doc-123';
    const content = 'Napoleon Bonaparte was defeated at Waterloo in 1815.';

    const extractionResult = {
      persons: [
        {
          fullName: 'Napoleon Bonaparte',
          firstName: 'Napoleon',
          lastName: 'Bonaparte',
          title: 'Emperor',
          birthDate: '1769-08-15',
          deathDate: '1821-05-05',
          description: 'French military leader',
        },
      ],
      events: [
        {
          title: 'Battle of Waterloo',
          description: 'Final defeat of Napoleon',
          dateStart: '1815-06-18',
          dateType: 'exact',
          location: 'Waterloo, Belgium',
          relatedPersonNames: ['Napoleon Bonaparte'],
        },
      ],
    };

    mockExtractorService.extractEntities.mockResolvedValue(extractionResult);

    // Mock transaction
    mockPrismaService.$transaction.mockImplementation(async (callback) => {
      const tx = {
        person: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 'person-123',
            fullName: 'Napoleon Bonaparte',
          }),
        },
        event: {
          create: jest.fn().mockResolvedValue({
            id: 'event-123',
            title: 'Battle of Waterloo',
          }),
        },
        personDocument: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
        },
        personEvent: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
        },
      };
      return await callback(tx);
    });

    const command = new ExtractEntitiesCommand(documentId, content);
    await handler.execute(command);

    expect(mockExtractorService.extractEntities).toHaveBeenCalledWith(content);
    expect(mockPrismaService.$transaction).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.any(EntitiesExtractedEvent),
    );

    const publishedEvent = mockEventBus.publish.mock.calls[0][0];
    expect(publishedEvent).toBeInstanceOf(EntitiesExtractedEvent);
    expect(publishedEvent.documentId).toBe(documentId);
    expect(publishedEvent.personCount).toBe(1);
    expect(publishedEvent.eventCount).toBe(1);
  });

  it('should use existing person if already exists', async () => {
    const documentId = 'doc-123';
    const content = 'Napoleon Bonaparte was mentioned.';

    const extractionResult = {
      persons: [
        {
          fullName: 'Napoleon Bonaparte',
          firstName: 'Napoleon',
          lastName: 'Bonaparte',
        },
      ],
      events: [],
    };

    mockExtractorService.extractEntities.mockResolvedValue(extractionResult);

    const existingPerson = {
      id: 'existing-person-123',
      fullName: 'Napoleon Bonaparte',
    };

    mockPrismaService.$transaction.mockImplementation(async (callback) => {
      const tx = {
        person: {
          findFirst: jest.fn().mockResolvedValue(existingPerson),
          create: jest.fn(),
        },
        event: {
          create: jest.fn(),
        },
        personDocument: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
        },
        personEvent: {
          findUnique: jest.fn(),
          create: jest.fn(),
        },
      };
      return await callback(tx);
    });

    const command = new ExtractEntitiesCommand(documentId, content);
    await handler.execute(command);

    expect(mockPrismaService.$transaction).toHaveBeenCalled();
    // Verify that create was not called for person
    const txCallback = mockPrismaService.$transaction.mock.calls[0][0];
    const mockTx = {
      person: {
        findFirst: jest.fn().mockResolvedValue(existingPerson),
        create: jest.fn(),
      },
      event: {
        create: jest.fn(),
      },
      personDocument: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      personEvent: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    await txCallback(mockTx);
    expect(mockTx.person.create).not.toHaveBeenCalled();
  });

  it('should handle extraction errors', async () => {
    const documentId = 'doc-123';
    const content = 'Test content';

    mockExtractorService.extractEntities.mockRejectedValue(
      new Error('OpenAI API error'),
    );

    const command = new ExtractEntitiesCommand(documentId, content);

    await expect(handler.execute(command)).rejects.toThrow('OpenAI API error');
    expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should not create duplicate PersonDocument relationships', async () => {
    const documentId = 'doc-123';
    const content = 'Napoleon Bonaparte was mentioned.';

    const extractionResult = {
      persons: [
        {
          fullName: 'Napoleon Bonaparte',
        },
      ],
      events: [],
    };

    mockExtractorService.extractEntities.mockResolvedValue(extractionResult);

    const existingPerson = {
      id: 'person-123',
      fullName: 'Napoleon Bonaparte',
    };

    mockPrismaService.$transaction.mockImplementation(async (callback) => {
      const tx = {
        person: {
          findFirst: jest.fn().mockResolvedValue(existingPerson),
          create: jest.fn(),
        },
        event: {
          create: jest.fn(),
        },
        personDocument: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'existing-relation',
          }),
          create: jest.fn(),
        },
        personEvent: {
          findUnique: jest.fn(),
          create: jest.fn(),
        },
      };
      return await callback(tx);
    });

    const command = new ExtractEntitiesCommand(documentId, content);
    await handler.execute(command);

    const txCallback = mockPrismaService.$transaction.mock.calls[0][0];
    const mockTx = {
      person: {
        findFirst: jest.fn().mockResolvedValue(existingPerson),
        create: jest.fn(),
      },
      event: {
        create: jest.fn(),
      },
      personDocument: {
        findUnique: jest.fn().mockResolvedValue({ id: 'existing' }),
        create: jest.fn(),
      },
      personEvent: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    await txCallback(mockTx);
    expect(mockTx.personDocument.create).not.toHaveBeenCalled();
  });

  it('should create PersonEvent relationships for related persons', async () => {
    const documentId = 'doc-123';
    const content = 'Napoleon fought at Waterloo.';

    const extractionResult = {
      persons: [
        {
          fullName: 'Napoleon Bonaparte',
        },
      ],
      events: [
        {
          title: 'Battle of Waterloo',
          relatedPersonNames: ['Napoleon Bonaparte'],
        },
      ],
    };

    mockExtractorService.extractEntities.mockResolvedValue(extractionResult);

    const createdPerson = {
      id: 'person-123',
      fullName: 'Napoleon Bonaparte',
    };

    const createdEvent = {
      id: 'event-123',
      title: 'Battle of Waterloo',
    };

    mockPrismaService.$transaction.mockImplementation(async (callback) => {
      const tx = {
        person: {
          findFirst: jest.fn().mockResolvedValue(createdPerson),
          create: jest.fn(),
        },
        event: {
          create: jest.fn().mockResolvedValue(createdEvent),
        },
        personDocument: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
        },
        personEvent: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
        },
      };
      return await callback(tx);
    });

    const command = new ExtractEntitiesCommand(documentId, content);
    await handler.execute(command);

    expect(mockPrismaService.$transaction).toHaveBeenCalled();
    const txCallback = mockPrismaService.$transaction.mock.calls[0][0];
    const mockTx = {
      person: {
        findFirst: jest.fn().mockResolvedValue(createdPerson),
        create: jest.fn(),
      },
      event: {
        create: jest.fn().mockResolvedValue(createdEvent),
      },
      personDocument: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      personEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    await txCallback(mockTx);
    expect(mockTx.personEvent.create).toHaveBeenCalledWith({
      data: {
        personId: 'person-123',
        eventId: 'event-123',
        context: null,
      },
    });
  });
});
