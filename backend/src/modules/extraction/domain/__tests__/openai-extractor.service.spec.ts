import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { OpenAIExtractorService } from '../openai-extractor.service';

// Mock OpenAI before importing the service
const mockChatCompletionsCreate = jest.fn();

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockChatCompletionsCreate,
      },
    },
  }));
});

describe('OpenAIExtractorService', () => {
  let service: OpenAIExtractorService;
  let configService: ConfigService;
  let mockConfigService: { get: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    const config: Record<string, unknown> = {
      OPENAI_API_KEY: 'test-api-key',
      OPENAI_MODEL: 'gpt-4',
      OPENAI_TEMPERATURE: 0.3,
      OPENAI_MAX_TOKENS: 4000,
    };

    mockConfigService = {
      get: jest.fn((key: string) => config[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAIExtractorService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OpenAIExtractorService>(OpenAIExtractorService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw error if OPENAI_API_KEY is not configured', async () => {
    mockConfigService.get.mockReturnValue(undefined);

    await expect(
      Test.createTestingModule({
        providers: [
          OpenAIExtractorService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile(),
    ).rejects.toThrow('OPENAI_API_KEY is not configured');
  });

  describe('extractEntities', () => {
    it('should extract entities from valid content', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                persons: [
                  {
                    fullName: 'Napoleon Bonaparte',
                    firstName: 'Napoleon',
                    lastName: 'Bonaparte',
                    title: 'Emperor',
                  },
                ],
                events: [
                  {
                    title: 'Battle of Waterloo',
                    description: 'Final defeat of Napoleon',
                    dateStart: '1815-06-18',
                    dateType: 'exact',
                  },
                ],
              }),
            },
          },
        ],
      };

      mockChatCompletionsCreate.mockResolvedValue(mockResponse);

      const content = 'Napoleon Bonaparte was defeated at Waterloo in 1815.';
      const result = await service.extractEntities(content);

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('historical data extraction'),
          },
          {
            role: 'user',
            content: expect.stringContaining(content),
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      });

      expect(result.persons).toHaveLength(1);
      expect(result.persons[0].fullName).toBe('Napoleon Bonaparte');
      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe('Battle of Waterloo');
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'invalid json',
            },
          },
        ],
      };

      mockChatCompletionsCreate.mockResolvedValue(mockResponse);

      await expect(service.extractEntities('test content')).rejects.toThrow(
        'Failed to parse OpenAI response as JSON',
      );
    });

    it('should handle API errors', async () => {
      mockChatCompletionsCreate.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded'),
      );

      await expect(service.extractEntities('test content')).rejects.toThrow(
        'OpenAI API error: OpenAI API rate limit exceeded',
      );
    });

    it('should return empty arrays if response has no persons or events', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                persons: [],
                events: [],
              }),
            },
          },
        ],
      };

      mockChatCompletionsCreate.mockResolvedValue(mockResponse);

      const result = await service.extractEntities('test content');

      expect(result.persons).toEqual([]);
      expect(result.events).toEqual([]);
    });

    it('should handle missing persons or events arrays', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                persons: [
                  {
                    fullName: 'Test Person',
                  },
                ],
              }),
            },
          },
        ],
      };

      mockChatCompletionsCreate.mockResolvedValue(mockResponse);

      const result = await service.extractEntities('test content');

      expect(result.persons).toHaveLength(1);
      expect(result.events).toEqual([]);
    });
  });
});
