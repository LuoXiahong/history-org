import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { UserRole } from '../interfaces/jwt-payload.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let loginMock: jest.Mock;
  let registerMock: jest.Mock;

  const mockAuthResponse = {
    accessToken: 'mock-jwt-token',
    tokenType: 'Bearer',
    expiresIn: 86400,
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      roles: [UserRole.USER],
    },
  };

  beforeEach(async () => {
    loginMock = jest.fn().mockResolvedValue(mockAuthResponse);
    registerMock = jest.fn().mockResolvedValue(mockAuthResponse);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: loginMock,
            register: registerMock,
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('login', () => {
    it('should return user response for valid login', async () => {
      const dto = { email: 'test@example.com', password: 'ValidPass123' };
      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.login(dto, mockRes);

      expect(loginMock).toHaveBeenCalledWith(dto, mockRes);
      expect(result).toEqual(mockAuthResponse.user);
    });
  });

  describe('register', () => {
    it('should return user response for valid registration', async () => {
      const dto = {
        email: 'newuser@example.com',
        password: 'SecurePass123',
        name: 'New User',
      };
      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.register(dto, mockRes);

      expect(registerMock).toHaveBeenCalledWith(dto, mockRes);
      expect(result).toEqual(mockAuthResponse.user);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user info', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        roles: [UserRole.USER],
      };

      const result = controller.getCurrentUser(user);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        roles: [UserRole.USER],
      });
    });
  });
});
