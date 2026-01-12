import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, EventBus } from '@nestjs/cqrs';
import { PrismaService } from '../../../../../shared/infrastructure/database/prisma.service';
import { OpenAIExtractorService } from '../../../domain/openai-extractor.service';
import { ExtractEntitiesHandler } from '../extract-entities.handler';
import { ExtractEntitiesCommand } from '../../impl/extract-entities.command';
import { EntitiesExtractedEvent } from '../../../events/impl/entities-extracted.event';

interface MockTransaction {
  person: {
    findFirst: jest.Mock;
    create: jest.Mock;
  };
  event: {
    create: jest.Mock;
  };
  personDocument: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
  personEvent: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
}

describe('ExtractEntitiesHandler', () => {
  let handler: ExtractEntitiesHandler;
  let transactionMock: jest.Mock;
  let extractEntitiesMock: jest.Mock;
  let publishMock: jest.Mock;

  beforeEach(async () => {
    transactionMock = jest.fn();
    extractEntitiesMock = jest.fn();
    publishMock = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        ExtractEntitiesHandler,
        {
          provide: PrismaService,
          useValue: {
            $transaction: transactionMock,
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
          },
        },
        {
          provide: OpenAIExtractorService,
          useValue: {
            extractEntities: extractEntitiesMock,
          },
        },
        {
          provide: EventBus,
          useValue: {
            publish: publishMock,
          },
        },
      ],
    }).compile();

    handler = module.get<ExtractEntitiesHandler>(ExtractEntitiesHandler);
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

    extractEntitiesMock.mockResolvedValue(extractionResult);

    // Mock transaction
    transactionMock.mockImplementation(
      async (callback: (tx: MockTransaction) => Promise<void>) => {
        const tx: MockTransaction = {
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
        return callback(tx);
      },
    );

    const command = new ExtractEntitiesCommand(documentId, content);
    await handler.execute(command);

    expect(extractEntitiesMock).toHaveBeenCalledWith(content);
    expect(transactionMock).toHaveBeenCalled();
    expect(publishMock).toHaveBeenCalledWith(
      expect.any(EntitiesExtractedEvent),
    );

    const publishCalls = publishMock.mock.calls as Array<
      [EntitiesExtractedEvent]
    >;
    const publishedEvent = publishCalls[0][0];
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

    extractEntitiesMock.mockResolvedValue(extractionResult);

    const existingPerson = {
      id: 'existing-person-123',
      fullName: 'Napoleon Bonaparte',
    };

    transactionMock.mockImplementation(
      async (callback: (tx: MockTransaction) => Promise<void>) => {
        const tx: MockTransaction = {
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
        return callback(tx);
      },
    );

    const command = new ExtractEntitiesCommand(documentId, content);
    await handler.execute(command);

    expect(transactionMock).toHaveBeenCalled();
    // Verify that create was not called for person
    const txCalls = transactionMock.mock.calls as Array<
      [(tx: MockTransaction) => Promise<void>]
    >;
    const txCallback = txCalls[0][0];
    const mockTx: MockTransaction = {
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

    extractEntitiesMock.mockRejectedValue(new Error('OpenAI API error'));

    const command = new ExtractEntitiesCommand(documentId, content);

    await expect(handler.execute(command)).rejects.toThrow('OpenAI API error');
    expect(transactionMock).not.toHaveBeenCalled();
    expect(publishMock).not.toHaveBeenCalled();
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

    extractEntitiesMock.mockResolvedValue(extractionResult);

    const existingPerson = {
      id: 'person-123',
      fullName: 'Napoleon Bonaparte',
    };

    transactionMock.mockImplementation(
      async (callback: (tx: MockTransaction) => Promise<void>) => {
        const tx: MockTransaction = {
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
        return callback(tx);
      },
    );

    const command = new ExtractEntitiesCommand(documentId, content);
    await handler.execute(command);

    const txCalls2 = transactionMock.mock.calls as Array<
      [(tx: MockTransaction) => Promise<void>]
    >;
    const txCallback2 = txCalls2[0][0];
    const mockTx: MockTransaction = {
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
    await txCallback2(mockTx);
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

    extractEntitiesMock.mockResolvedValue(extractionResult);

    const createdPerson = {
      id: 'person-123',
      fullName: 'Napoleon Bonaparte',
    };

    const createdEvent = {
      id: 'event-123',
      title: 'Battle of Waterloo',
    };

    transactionMock.mockImplementation(
      async (callback: (tx: MockTransaction) => Promise<void>) => {
        const tx: MockTransaction = {
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
        return callback(tx);
      },
    );

    const command = new ExtractEntitiesCommand(documentId, content);
    await handler.execute(command);

    expect(transactionMock).toHaveBeenCalled();
    const txCalls3 = transactionMock.mock.calls as Array<
      [(tx: MockTransaction) => Promise<void>]
    >;
    const txCallback3 = txCalls3[0][0];
    const mockTx2: MockTransaction = {
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
    await txCallback3(mockTx2);
    expect(mockTx2.personEvent.create).toHaveBeenCalledWith({
      data: {
        personId: 'person-123',
        eventId: 'event-123',
        context: null,
      },
    });
  });
});
