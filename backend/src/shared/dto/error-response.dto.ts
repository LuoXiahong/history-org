import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error code for client handling',
    example: 'VALIDATION_ERROR',
  })
  error: string;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Validation failed',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Detailed validation errors',
    example: [{ field: 'email', message: 'Invalid email format' }],
  })
  details?: Array<{ field: string; message: string }>;

  @ApiProperty({
    description: 'ISO timestamp of the error',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path',
    example: '/api/v1/knowledge',
  })
  path: string;

  @ApiPropertyOptional({
    description: 'Correlation ID for request tracing',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  correlationId?: string;
}
