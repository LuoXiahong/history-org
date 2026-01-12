import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { UserRole } from '../interfaces/jwt-payload.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let loginMock: jest.Mock;
  let registerMock: jest.Mock;
  let logoutMock: jest.Mock;

  const mockUserResponse = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    roles: [UserRole.USER],
  };

  beforeEach(async () => {
    loginMock = jest.fn().mockResolvedValue(mockUserResponse);
    registerMock = jest.fn().mockResolvedValue(mockUserResponse);
    logoutMock = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: loginMock,
            register: registerMock,
            logout: logoutMock,
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('login', () => {
    it('should return user response for valid login', async () => {
      const dto = { email: 'test@example.com', password: 'ValidPass123' };
      const mockRes = {} as Response;

      const result = await controller.login(dto, mockRes);

      expect(loginMock).toHaveBeenCalledWith(dto, mockRes);
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('register', () => {
    it('should return user response for valid registration', async () => {
      const dto = {
        email: 'newuser@example.com',
        password: 'SecurePass123',
        name: 'New User',
      };
      const mockRes = {} as Response;

      const result = await controller.register(dto, mockRes);

      expect(registerMock).toHaveBeenCalledWith(dto, mockRes);
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('logout', () => {
    it('should call logout service', async () => {
      const mockRes = {} as Response;

      await controller.logout(mockRes);

      expect(logoutMock).toHaveBeenCalledWith(mockRes);
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
