import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { UserRole } from '../interfaces/jwt-payload.interface';

jest.mock('bcrypt');
jest.mock('../../../shared/infrastructure/database/prisma.service');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<{
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  }>;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedpassword123',
    name: 'Test User',
    roles: JSON.stringify([UserRole.USER]),
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockImplementation((key: string, defaultVal?: string) => {
                const config: Record<string, string> = {
                  JWT_EXPIRATION: '1d',
                };
                return config[key] ?? defaultVal;
              }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return auth response for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'ValidPassword123',
      });

      expect(result).toEqual({
        accessToken: 'mock-jwt-token',
        tokenType: 'Bearer',
        expiresIn: 86400,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          roles: [UserRole.USER],
        },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'SomePassword123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'WrongPassword123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for deactivated user', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'ValidPassword123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should create user and return auth response', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword123');

      const result = await service.register({
        email: 'newuser@example.com',
        password: 'SecurePass123',
        name: 'New User',
      });

      expect(result).toEqual({
        accessToken: 'mock-jwt-token',
        tokenType: 'Bearer',
        expiresIn: 86400,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          roles: [UserRole.USER],
        },
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'newuser@example.com',
          password: 'hashedpassword123',
          name: 'New User',
          roles: JSON.stringify([UserRole.USER]),
          isActive: true,
        },
      });
    });

    it('should throw ConflictException for existing email', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'SecurePass123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password before saving', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      await service.register({
        email: 'newuser@example.com',
        password: 'PlainPassword123',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('PlainPassword123', 12);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password: 'hashed-password',
          }),
        }),
      );
    });
  });

  describe('validateToken', () => {
    it('should return payload for valid token', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        roles: [UserRole.USER],
      };
      jest.spyOn(jwtService, 'verify').mockReturnValue(payload);

      const result = await service.validateToken('valid-token');

      expect(result).toEqual(payload);
    });

    it('should return null for invalid token', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await service.validateToken('invalid-token');

      expect(result).toBeNull();
    });
  });
});
