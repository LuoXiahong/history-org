# REQ-0010: Authentication & Authorization Module

| Field | Value |
|-------|-------|
| **Status** | `APPLIED` |
| **Priority** | Critical |
| **Complexity** | High |
| **Estimated Effort** | 8-12 hours |
| **Dependencies** | REQ-0009 (Core Configuration) |
| **Affects** | New `AuthModule`, existing controllers (minimal integration) |

---

## 1. Overview

This requirement creates a complete authentication and authorization module using JWT tokens and Passport.js. The module provides secure user authentication, role-based access control (RBAC), and reusable security decorators.

> [!IMPORTANT]
> **Architecture Decision:** This module uses the **Service Pattern** (AuthController → AuthService) instead of CQRS. See [REQ-0018](./REQ-0018-auth-architecture-decision.md) for the full rationale. Key reasons:
> - Auth operations are simple CRUD (login, register, logout)
> - No cross-module events or async workflows
> - Passport.js integrates naturally with services
> - Lower overhead for frequently-called endpoints

## 2. Objectives

- Implement JWT-based authentication with Passport.js
- Create role-based authorization with guards
- Provide public route decorator for unauthenticated access
- Support token refresh mechanism
- Secure password handling with bcrypt

## 3. Scope

### In Scope
- `AuthModule` with complete JWT authentication
- `JwtStrategy` for Passport.js
- `JwtAuthGuard` for protecting routes
- `RolesGuard` for role-based access control
- `@Public()` decorator for public routes
- `@Roles()` decorator for role requirements
- `@CurrentUser()` decorator for extracting user from request
- User entity with password hashing
- Login/Register/Refresh endpoints

### Out of Scope
- OAuth2/Social login (future requirement)
- Multi-factor authentication (future requirement)
- Session-based authentication
- Password reset flow (future requirement)
- Email verification (future requirement)

---

## 4. Technical Specification

### 4.1 Required Dependencies

```bash
npm install @nestjs/passport @nestjs/jwt passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt
```

### 4.2 Module Structure

```
backend/src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   └── jwt.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── roles.guard.ts
├── decorators/
│   ├── public.decorator.ts
│   ├── roles.decorator.ts
│   └── current-user.decorator.ts
├── dto/
│   ├── login.dto.ts
│   ├── register.dto.ts
│   ├── refresh-token.dto.ts
│   └── auth-response.dto.ts
├── interfaces/
│   ├── jwt-payload.interface.ts
│   └── authenticated-request.interface.ts
└── __tests__/
    ├── auth.controller.spec.ts
    ├── auth.service.spec.ts
    ├── jwt.strategy.spec.ts
    └── guards/
        ├── jwt-auth.guard.spec.ts
        └── roles.guard.spec.ts
```

### 4.3 Auth Module

**Location:** `backend/src/modules/auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PrismaModule } from '../../shared/infrastructure/database/prisma.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '1d'),
          issuer: 'history-org',
          audience: 'history-org-client',
        },
      }),
    }),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    // Register guards globally
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

### 4.4 JWT Payload Interface

**Location:** `backend/src/modules/auth/interfaces/jwt-payload.interface.ts`

```typescript
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
}

export interface JwtPayload {
  sub: string;          // User ID
  email: string;
  roles: UserRole[];
  iat?: number;         // Issued at
  exp?: number;         // Expiration
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: UserRole[];
}
```

### 4.5 Authenticated Request Interface

**Location:** `backend/src/modules/auth/interfaces/authenticated-request.interface.ts`

```typescript
import { Request } from 'express';
import { AuthenticatedUser } from './jwt-payload.interface';

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
```

### 4.6 JWT Strategy

**Location:** `backend/src/modules/auth/strategies/jwt.strategy.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { JwtPayload, AuthenticatedUser } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      issuer: 'history-org',
      audience: 'history-org-client',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, roles: true, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    return {
      id: user.id,
      email: user.email,
      roles: user.roles,
    };
  }
}
```

### 4.7 JWT Auth Guard

**Location:** `backend/src/modules/auth/guards/jwt-auth.guard.ts`

```typescript
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser>(
    err: Error | null,
    user: TUser | false,
    info: Error | null,
  ): TUser {
    if (err) {
      throw err;
    }

    if (!user) {
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      throw new UnauthorizedException('Authentication required');
    }

    return user;
  }
}
```

### 4.8 Roles Guard

**Location:** `backend/src/modules/auth/guards/roles.guard.ts`

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole, AuthenticatedUser } from '../interfaces/jwt-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    // If no user (shouldn't happen if JwtAuthGuard runs first)
    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
```

### 4.9 Decorators

**Location:** `backend/src/modules/auth/decorators/public.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as publicly accessible (no authentication required)
 * @example
 * @Public()
 * @Get('public-data')
 * getPublicData() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**Location:** `backend/src/modules/auth/decorators/roles.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../interfaces/jwt-payload.interface';

export const ROLES_KEY = 'roles';

/**
 * Restricts access to users with specified roles
 * @param roles - Array of required roles (OR logic - user needs at least one)
 * @example
 * @Roles(UserRole.ADMIN)
 * @Get('admin-only')
 * adminOnlyRoute() { ... }
 * 
 * @Roles(UserRole.ADMIN, UserRole.MODERATOR)
 * @Get('admin-or-mod')
 * adminOrModRoute() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

**Location:** `backend/src/modules/auth/decorators/current-user.decorator.ts`

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

/**
 * Extracts the authenticated user from the request
 * @param data - Optional property to extract from user object
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthenticatedUser) { ... }
 * 
 * @Get('my-id')
 * getMyId(@CurrentUser('id') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (data) {
      return user?.[data];
    }

    return user;
  },
);
```

### 4.10 DTOs

**Location:** `backend/src/modules/auth/dto/login.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password: string;
}
```

**Location:** `backend/src/modules/auth/dto/register.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'newuser@example.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    description: 'User password (min 8 chars, must contain uppercase, lowercase, number)',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    },
  )
  password: string;

  @ApiPropertyOptional({
    description: 'User display name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name?: string;
}
```

**Location:** `backend/src/modules/auth/dto/auth-response.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../interfaces/jwt-payload.interface';

export class UserResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe', required: false })
  name?: string;

  @ApiProperty({ enum: UserRole, isArray: true, example: [UserRole.USER] })
  roles: UserRole[];
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  tokenType: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 86400,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Authenticated user information',
    type: UserResponseDto,
  })
  user: UserResponseDto;
}
```

### 4.11 Auth Service

**Location:** `backend/src/modules/auth/auth.service.ts`

```typescript
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload, UserRole } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      this.logger.warn(`Failed login attempt for email: ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for user: ${user.id}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateAuthResponse(user);
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        roles: [UserRole.USER],
        isActive: true,
      },
    });

    this.logger.log(`New user registered: ${user.id}`);

    return this.generateAuthResponse(user);
  }

  async validateToken(token: string): Promise<JwtPayload | null> {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  private generateAuthResponse(user: {
    id: string;
    email: string;
    name: string | null;
    roles: UserRole[];
  }): AuthResponseDto {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    const expiresIn = this.getExpirationSeconds();

    return {
      accessToken: this.jwtService.sign(payload),
      tokenType: 'Bearer',
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        roles: user.roles,
      },
    };
  }

  private getExpirationSeconds(): number {
    const expiration = this.configService.get<string>('JWT_EXPIRATION', '1d');
    
    // Parse expiration string (e.g., '1d', '2h', '30m')
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 86400; // Default to 1 day

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * (multipliers[unit] || 86400);
  }
}
```

### 4.12 Auth Controller

**Location:** `backend/src/modules/auth/auth.controller.ts`

```typescript
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser } from './interfaces/jwt-payload.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticates a user and returns a JWT token',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'User registration',
    description: 'Creates a new user account and returns a JWT token',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Registration successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already registered',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Returns the authenticated user information',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User information retrieved',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async getCurrentUser(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return {
      id: user.id,
      email: user.email,
      roles: user.roles,
    };
  }
}
```

### 4.13 User Prisma Schema Addition

**Location:** Add to `backend/prisma/schema.prisma`

```prisma
enum UserRole {
  USER
  ADMIN
  MODERATOR
}

model User {
  id          String     @id @default(uuid())
  email       String     @unique
  password    String
  name        String?
  roles       UserRole[] @default([USER])
  isActive    Boolean    @default(true)
  lastLoginAt DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@map("users")
}
```

---

## 5. Acceptance Criteria

- [ ] Users can register with email and password
- [ ] Users can login and receive a JWT token
- [ ] Protected routes return 401 without valid token
- [ ] Protected routes are accessible with valid token
- [ ] `@Public()` decorator allows unauthenticated access
- [ ] `@Roles()` decorator restricts access based on user roles
- [ ] `@CurrentUser()` decorator extracts user from request
- [ ] Passwords are hashed with bcrypt (12 rounds)
- [ ] Token expiration is configurable
- [ ] Guards are registered globally
- [ ] All auth endpoints are documented in Swagger

---

## 6. Testing Strategy

### 6.1 Unit Tests

```typescript
// auth.service.spec.ts
describe('AuthService', () => {
  describe('login', () => {
    it('should return auth response for valid credentials', async () => {});
    it('should throw UnauthorizedException for invalid email', async () => {});
    it('should throw UnauthorizedException for invalid password', async () => {});
    it('should throw UnauthorizedException for deactivated user', async () => {});
  });

  describe('register', () => {
    it('should create user and return auth response', async () => {});
    it('should throw ConflictException for existing email', async () => {});
    it('should hash password before saving', async () => {});
  });
});

// jwt-auth.guard.spec.ts
describe('JwtAuthGuard', () => {
  it('should allow public routes without authentication', async () => {});
  it('should require authentication for non-public routes', async () => {});
  it('should throw UnauthorizedException for expired tokens', async () => {});
});

// roles.guard.spec.ts
describe('RolesGuard', () => {
  it('should allow access when user has required role', async () => {});
  it('should deny access when user lacks required role', async () => {});
  it('should allow access when no roles are required', async () => {});
});
```

### 6.2 E2E Tests

```typescript
describe('Auth (e2e)', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {});
    it('should reject duplicate email', async () => {});
    it('should validate password strength', async () => {});
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {});
    it('should reject invalid credentials', async () => {});
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user info with valid token', async () => {});
    it('should return 401 without token', async () => {});
  });
});
```

---

## 7. Security Considerations

- Passwords hashed with bcrypt (12 salt rounds)
- JWT tokens signed with HS256 algorithm
- Token expiration enforced
- No sensitive data in JWT payload
- Rate limiting on auth endpoints (see REQ-0012)
- Failed login attempts logged for security monitoring
- HTTPS required in production

---

## 8. References

- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [NestJS Authorization](https://docs.nestjs.com/security/authorization)
- [Passport.js JWT Strategy](http://www.passportjs.org/packages/passport-jwt/)
- [bcrypt Best Practices](https://auth0.com/blog/hashing-in-action-understanding-bcrypt/)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
