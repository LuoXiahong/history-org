import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { UserRole, JwtPayload } from '../interfaces/jwt-payload.interface';

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
    it('should set httpOnly cookie and return user data for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      const result = await service.login(
        {
          email: 'test@example.com',
          password: 'ValidPassword123',
        },
        mockRes,
      );

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        roles: [UserRole.USER],
      });

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'access_token',
        'mock-jwt-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/',
        }),
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { lastLoginAt: expect.any(Date) as Date },
      });
    });

    it('should reject login with invalid email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const mockRes = { cookie: jest.fn() } as unknown as Response;

      await expect(
        service.login(
          {
            email: 'nonexistent@example.com',
            password: 'SomePassword123',
          },
          mockRes,
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockRes.cookie).not.toHaveBeenCalled();
    });

    it('should reject login with invalid password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const mockRes = { cookie: jest.fn() } as unknown as Response;

      await expect(
        service.login(
          {
            email: 'test@example.com',
            password: 'WrongPassword123',
          },
          mockRes,
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockRes.cookie).not.toHaveBeenCalled();
    });

    it('should reject login for deactivated user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });
      const mockRes = { cookie: jest.fn() } as unknown as Response;

      await expect(
        service.login(
          {
            email: 'test@example.com',
            password: 'ValidPassword123',
          },
          mockRes,
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockRes.cookie).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should create user, set cookie and return user data', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword123');

      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      const result = await service.register(
        {
          email: 'newuser@example.com',
          password: 'SecurePass123',
          name: 'New User',
        },
        mockRes,
      );

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        roles: [UserRole.USER],
      });

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'access_token',
        'mock-jwt-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/',
        }),
      );

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

    it('should reject registration with existing email', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      const mockRes = { cookie: jest.fn() } as unknown as Response;

      await expect(
        service.register(
          {
            email: 'test@example.com',
            password: 'SecurePass123',
          },
          mockRes,
        ),
      ).rejects.toThrow(ConflictException);

      expect(mockRes.cookie).not.toHaveBeenCalled();
    });

    it('should hash password before saving user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      const mockRes = { cookie: jest.fn() } as unknown as Response;

      await service.register(
        {
          email: 'newuser@example.com',
          password: 'PlainPassword123',
        },
        mockRes,
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('PlainPassword123', 12);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password: 'hashed-password',
          }) as Record<string, unknown>,
        }),
      );
    });
  });

  describe('logout', () => {
    it('should clear access_token cookie', async () => {
      const mockRes = {
        clearCookie: jest.fn(),
      } as unknown as Response;

      await service.logout(mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        'access_token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/',
        }),
      );
    });
  });

  describe('validateToken', () => {
    it('should return payload for valid token', () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        roles: [UserRole.USER],
      };
      jest.spyOn(jwtService, 'verify').mockReturnValue(payload);

      const result = service.validateToken('valid-token');

      expect(result).toEqual(payload);
    });

    it('should return null for invalid token', () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = service.validateToken('invalid-token');

      expect(result).toBeNull();
    });
  });
});
