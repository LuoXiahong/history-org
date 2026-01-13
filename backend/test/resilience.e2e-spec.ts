import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import request, { Response } from 'supertest';
import { AppModule } from './../src/app.module';

describe('Resilience (e2e)', () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    // Use NestFactory to create the app exactly as in production
    // This ensures global guards (APP_GUARD) from AppModule are applied correctly
    app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: false,
    });
    // Enable trust proxy to read X-Forwarded-For
    app.set('trust proxy', 1);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      for (let i = 0; i < 2; i++) {
        await request(app.getHttpServer())
          .get('/api/v1/non-existent-for-rate-limit')
          .expect(404);
      }
    });

    it('should return 429 when limit exceeded', async () => {
      const responses: Response[] = [];
      for (let i = 0; i < 10; i++) {
        try {
          const res = await request(app.getHttpServer())
            .get('/')
            .set('X-Forwarded-For', '1.2.3.4');
          responses.push(res);
        } catch (error) {
          console.error('Request failed:', error);
        }
      }

      const tooManyRequests = responses.filter((r) => r.status === 429);

      expect(tooManyRequests.length).toBeGreaterThan(0);
      if (tooManyRequests.length > 0) {
        expect((tooManyRequests[0].body as { error: string }).error).toBe(
          'RATE_LIMIT_EXCEEDED',
        );
      }
    });
  });

  describe('Error Handling', () => {
    it('should return standardized error format for 404', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/non-existent-id')
        .expect(404);

      const body = response.body as {
        statusCode: number;
        error: string;
        message: string;
        timestamp: string;
        path: string;
      };

      expect(body.statusCode).toBe(404);

      expect(body.error).toBe('NOT_FOUND');
      expect(typeof body.message).toBe('string');
      expect(typeof body.timestamp).toBe('string');
      expect(body.path).toBe('/api/v1/non-existent-id');
    });
  });
});
