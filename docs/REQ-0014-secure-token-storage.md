# REQ-0014: Secure Token Storage (httpOnly Cookies)

| Field | Value |
|-------|-------|
| **Status** | `DONE` |
| **Priority** | Critical |
| **Complexity** | Medium |
| **Estimated Effort** | 4-6 hours |
| **Dependencies** | REQ-0010 (Auth & Security) |
| **Affects** | Backend auth, Frontend auth context, Axios config |

---

## 1. Overview

**Security Issue:** JWT tokens are currently stored in `localStorage`, making them vulnerable to XSS attacks. Any malicious script injected into the page can steal the token.

**Solution:** Move token storage to `httpOnly` cookies which are inaccessible to JavaScript.

## 2. Objectives

- Replace localStorage token storage with httpOnly cookies
- Implement secure cookie configuration (Secure, SameSite, HttpOnly)
- Update backend to set cookies on login/register responses
- Update frontend to work without direct token access
- Maintain CSRF protection

## 3. Technical Specification

### 3.1 Backend Changes

#### Cookie Configuration

```typescript
// backend/src/modules/auth/auth.service.ts
import { Response } from 'express';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000, // 1 day
  path: '/',
};

async login(dto: LoginDto, res: Response): Promise<UserResponseDto> {
  // ... validate credentials
  const accessToken = this.generateToken(user);
  
  res.cookie('access_token', accessToken, COOKIE_OPTIONS);
  
  return {
    id: user.id,
    email: user.email,
    roles: user.roles,
  };
}

async logout(res: Response): Promise<void> {
  res.clearCookie('access_token', COOKIE_OPTIONS);
}
```

#### JWT Strategy Update

```typescript
// backend/src/modules/auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

// Extract JWT from cookie instead of Authorization header
const cookieExtractor = (req: Request): string | null => {
  if (req && req.cookies) {
    return req.cookies['access_token'];
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService, prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(), // Fallback for API clients
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }
}
```

#### Controller Updates

```typescript
// backend/src/modules/auth/auth.controller.ts
@Post('login')
@HttpCode(HttpStatus.OK)
async login(
  @Body() dto: LoginDto,
  @Res({ passthrough: true }) res: Response,
): Promise<UserResponseDto> {
  return this.authService.login(dto, res);
}

@Post('logout')
@HttpCode(HttpStatus.NO_CONTENT)
async logout(@Res({ passthrough: true }) res: Response): Promise<void> {
  return this.authService.logout(res);
}
```

### 3.2 Frontend Changes

#### Remove Token from localStorage

```typescript
// frontend/src/features/auth/context/AuthContext.tsx
// Remove all localStorage token operations
// Store only user info in state/localStorage (optional)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // On mount, call /auth/me to check if cookie is valid
  useEffect(() => {
    async function validateSession() {
      try {
        const user = await authApi.getCurrentUser();
        setState({ user, isAuthenticated: true, isLoading: false });
      } catch {
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    }
    validateSession();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const user = await authApi.login(credentials);
    setState({ user, isAuthenticated: true, isLoading: false });
  };

  const logout = async () => {
    await authApi.logout();
    setState({ user: null, isAuthenticated: false, isLoading: false });
  };
}
```

#### Update Axios Config

```typescript
// frontend/src/lib/axios.ts
export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Essential for httpOnly cookies
});

// Remove token interceptor - cookies are sent automatically
```

### 3.3 CORS Update

```typescript
// backend/src/main.ts
app.enableCors({
  origin: process.env.CORS_ORIGINS?.split(',') || 'http://localhost:5173',
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});
```

### 3.4 Cookie Parser Middleware

```bash
npm install cookie-parser
npm install -D @types/cookie-parser
```

```typescript
// backend/src/main.ts
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || 'http://localhost:5173',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.setGlobalPrefix('api/v1');
  // ...
}
```

## 4. Acceptance Criteria

- [x] JWT token is stored in httpOnly cookie, not localStorage
- [x] Cookie has Secure flag in production
- [x] Cookie has SameSite=strict
- [x] Frontend makes requests with `withCredentials: true`
- [x] Login response sets cookie, not token in body
- [x] Logout clears cookie
- [x] `/auth/me` validates session from cookie
- [x] Fallback to Authorization header for API clients
- [x] Tests updated for new auth flow
- [x] localStorage is cleared of any existing tokens

## 5. Testing Strategy

### Unit Tests

```typescript
describe('AuthService', () => {
  it('should set httpOnly cookie on login', async () => {
    const mockRes = { cookie: jest.fn() };
    await authService.login(validCredentials, mockRes as any);
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'access_token',
      expect.any(String),
      expect.objectContaining({ httpOnly: true }),
    );
  });
});
```

### E2E Tests

```typescript
describe('Auth (e2e)', () => {
  it('should set cookie on login', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    expect(response.headers['set-cookie']).toBeDefined();
    expect(response.headers['set-cookie'][0]).toContain('httpOnly');
  });
});
```

## 6. Migration Plan

1. Deploy backend with cookie support (backward compatible)
2. Update frontend to use cookies
3. Clear localStorage tokens in frontend initialization
4. Remove fallback Authorization header support (optional)

## 7. Security Considerations

- HttpOnly prevents XSS attacks from stealing tokens
- Secure flag ensures HTTPS-only in production
- SameSite=strict prevents CSRF attacks
- Token refresh should also use cookies
- Consider adding CSRF token for state-changing requests

## 8. Implementation Summary

### Backend Implementation
- ✅ Added `cookie-parser` middleware in `main.ts`
- ✅ Configured CORS with `credentials: true` and global prefix `/api/v1`
- ✅ Updated `AuthService.login()` to set `httpOnly` cookie with secure options
- ✅ Added `AuthService.logout()` method to clear cookie
- ✅ Updated `JwtStrategy` to extract token from cookie (with fallback to Authorization header)
- ✅ Updated `AuthController` to use `@Res({ passthrough: true })` for cookie handling
- ✅ Created comprehensive E2E tests for cookie-based authentication flow
- ✅ Updated unit tests to verify cookie setting/clearing

### Frontend Implementation
- ✅ Removed all `localStorage` token operations from `AuthContext`
- ✅ Updated Axios config with `withCredentials: true` and `baseURL: '/api/v1'`
- ✅ Removed token request interceptor (cookies sent automatically)
- ✅ Updated `AuthContext` to validate session via `/auth/me` endpoint on mount
- ✅ Added `clearLegacyStorage()` to remove old localStorage tokens
- ✅ Updated unit tests to reflect cookie-based flow
- ✅ Updated Playwright E2E tests for new authentication flow

### Security Features Implemented
- ✅ `httpOnly: true` - prevents XSS token theft
- ✅ `secure: true` in production - HTTPS-only transmission
- ✅ `sameSite: 'strict'` - CSRF protection
- ✅ Cookie path set to `/` for consistent behavior
- ✅ Fallback to Authorization header for API client compatibility

## 9. References

- [OWASP Session Management](https://owasp.org/www-community/Session_Management_Cheat_Sheet)
- [MDN HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [NestJS Cookies](https://docs.nestjs.com/techniques/cookies)
