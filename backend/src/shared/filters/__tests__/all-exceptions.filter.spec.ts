import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityNotFoundException } from '../../exceptions/not-found.exception';
import { DomainValidationException } from '../../exceptions/validation.exception';
import { AllExceptionsFilter } from '../all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  const mockJson = jest.fn();
  const mockStatus = jest.fn().mockImplementation(() => ({
    json: mockJson,
  }));
  const mockGetResponse = jest.fn().mockImplementation(() => ({
    status: mockStatus,
  }));
  const mockGetRequest = jest.fn().mockImplementation(() => ({
    url: '/test-url',
    method: 'GET',
    headers: {},
  }));
  const mockHttpArgumentsHost = jest.fn().mockImplementation(() => ({
    getResponse: mockGetResponse,
    getRequest: mockGetRequest,
  }));

  const mockArgumentsHost = {
    switchToHttp: mockHttpArgumentsHost,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AllExceptionsFilter],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('Domain Exceptions', () => {
    it('should format EntityNotFoundException correctly', () => {
      const exception = new EntityNotFoundException('User', '123');
      filter.catch(exception, mockArgumentsHost as unknown as ArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          error: 'ENTITY_NOT_FOUND',
          message: "User with identifier '123' was not found",
          path: '/test-url',
        }),
      );
    });

    it('should format DomainValidationException with field errors', () => {
      const exception = DomainValidationException.fromField(
        'email',
        'Invalid email',
      );
      filter.catch(exception, mockArgumentsHost as unknown as ArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'VALIDATION_ERROR',
          details: [{ field: 'email', message: 'Invalid email' }],
        }),
      );
    });
  });

  describe('HTTP Exceptions', () => {
    it('should handle ValidationPipe errors', () => {
      const exception = new HttpException(
        {
          message: ['email must be an email'],
          error: 'Bad Request',
          statusCode: 400,
        },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost as unknown as ArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'VALIDATION_ERROR',
          details: [{ field: 'email', message: 'email must be an email' }],
        }),
      );
    });

    it('should handle standard HttpExceptions', () => {
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      filter.catch(exception, mockArgumentsHost as unknown as ArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.FORBIDDEN,
          error: 'FORBIDDEN',
          message: 'Forbidden',
        }),
      );
    });
  });

  describe('Unknown Exceptions', () => {
    it('should handle unknown errors', () => {
      const exception = new Error('Something went wrong');
      filter.catch(exception, mockArgumentsHost as unknown as ArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'INTERNAL_SERVER_ERROR',
        }),
      );
    });
  });
});
