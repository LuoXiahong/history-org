import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { UserRole } from '../interfaces/jwt-payload.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

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
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockResolvedValue(mockAuthResponse),
            register: jest.fn().mockResolvedValue(mockAuthResponse),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should return auth response for valid login', async () => {
      const dto = { email: 'test@example.com', password: 'ValidPass123' };

      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('register', () => {
    it('should return auth response for valid registration', async () => {
      const dto = {
        email: 'newuser@example.com',
        password: 'SecurePass123',
        name: 'New User',
      };

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user info', async () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        roles: [UserRole.USER],
      };

      const result = await controller.getCurrentUser(user);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        roles: [UserRole.USER],
      });
    });
  });
});
