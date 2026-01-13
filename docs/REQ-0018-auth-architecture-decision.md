# REQ-0018: Auth Module Architecture Decision (Service Pattern)

| Field | Value |
|-------|-------|
| **Status** | `DONE` |
| **Priority** | Low |
| **Complexity** | Low |
| **Estimated Effort** | 1-2 hours |
| **Dependencies** | REQ-0010 (Auth & Security) |
| **Affects** | Auth module documentation, architecture consistency |

---

## 1. Overview

**Architectural Decision:** The Auth module uses the **Service Pattern** (AuthService + AuthController) instead of CQRS (Commands/Queries/Handlers). This requirement documents this decision, verifies the implementation is consistent, and updates documentation to reflect this architectural choice.

**Rationale:** Authentication operations (login, register, logout, getCurrentUser) are simple CRUD operations that don't benefit from CQRS complexity. Service pattern is more appropriate for this use case.

## 2. Objectives

- Document the architectural decision to use Service Pattern for Auth module
- Verify current implementation uses Service Pattern (not CQRS)
- Update REQ-0010 documentation to reflect Service Pattern
- Ensure consistency across codebase documentation
- Remove any CQRS references from auth-related documentation if present

## 3. Technical Specification

### 3.1 Current Implementation Structure

The Auth module should follow this structure (Service Pattern):

```
backend/src/modules/auth/
├── auth.module.ts          # Module definition (NO CqrsModule)
├── auth.controller.ts      # HTTP endpoints
├── auth.service.ts         # Business logic
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
│   └── auth-response.dto.ts
└── interfaces/
    └── jwt-payload.interface.ts
```

### 3.2 What Should NOT Exist

- ❌ `commands/` directory
- ❌ `queries/` directory
- ❌ `events/` directory
- ❌ `handlers/` directory
- ❌ `CqrsModule` import in `auth.module.ts`
- ❌ Command/Query classes
- ❌ Command/Query handlers

### 3.3 Verification Checklist

- [ ] `auth.module.ts` does NOT import `CqrsModule`
- [ ] No `commands/` directory in auth module
- [ ] No `queries/` directory in auth module
- [ ] No `events/` directory in auth module
- [ ] `AuthService` contains business logic directly
- [ ] `AuthController` calls `AuthService` methods directly
- [ ] No command/query handlers exist

### 3.4 Documentation Updates

Update `REQ-0010-auth-security.md` to:
- Explicitly state Service Pattern is used (not CQRS)
- Remove any CQRS references if present
- Add rationale section explaining why Service Pattern was chosen

## 4. Acceptance Criteria

- [ ] Auth module verified to use Service Pattern (no CQRS)
- [ ] `auth.module.ts` does not import `CqrsModule`
- [ ] No command/query/event directories exist in auth module
- [ ] REQ-0010 documentation updated to reflect Service Pattern
- [ ] Architecture decision documented with rationale
- [ ] Code review confirms consistency

## 5. Rationale: Why Service Pattern for Auth?

### 5.1 Simple Business Logic

Authentication operations are straightforward:
- **Login**: Validate credentials → Generate token → Set cookie
- **Register**: Check email exists → Hash password → Create user → Generate token
- **Logout**: Clear cookie
- **GetCurrentUser**: Extract user from JWT token

No complex business rules requiring command/query separation.

### 5.2 No Cross-Module Events

- Auth operations don't emit events consumed by other modules
- No asynchronous processing required
- No event-driven workflows
- Direct, synchronous operations are sufficient

### 5.3 Standard NestJS Pattern

- Most NestJS auth examples use Service Pattern
- Passport.js integration works naturally with services
- Less boilerplate than CQRS
- Easier to understand and maintain

### 5.4 Performance

- Auth endpoints are frequently called (every request with protected routes)
- Direct service calls are faster than command bus
- No overhead from command/query registration
- Simpler code = better performance

### 5.5 When CQRS Makes Sense (Other Modules)

CQRS is appropriate for:
- **Knowledge Module**: Complex queries, different read/write models
- **Extraction Module**: Event-driven AI processing, cross-module events
- **Ingestion Module**: Document indexing with async workflows

## 6. Testing Strategy

### 6.1 Verification Tests

```typescript
// auth.module.spec.ts
describe('AuthModule', () => {
  it('should NOT import CqrsModule', () => {
    const module = Test.createTestingModule({
      imports: [AuthModule],
    }).compile();
    
    // Verify no CqrsModule dependency
    expect(module.get(CqrsModule)).toBeUndefined();
  });
  
  it('should use AuthService directly', () => {
    const module = Test.createTestingModule({
      imports: [AuthModule],
    }).compile();
    
    const authService = module.get(AuthService);
    expect(authService).toBeDefined();
    expect(authService).toBeInstanceOf(AuthService);
  });
});
```

### 6.2 Integration Tests

Verify controller → service flow works correctly:

```typescript
describe('AuthController → AuthService Integration', () => {
  it('should call service methods directly', async () => {
    const authService = {
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
    };
    
    const controller = new AuthController(authService as any);
    
    await controller.login(mockLoginDto, mockResponse);
    
    expect(authService.login).toHaveBeenCalledTimes(1);
    expect(authService.login).toHaveBeenCalledWith(mockLoginDto, mockResponse);
  });
});
```

## 7. Implementation Steps

1. **Verify Current State**
   - Check `auth.module.ts` for CqrsModule import
   - Verify no commands/queries/events directories
   - Review AuthService and AuthController implementation

2. **Update Documentation**
   - Update `REQ-0010-auth-security.md` to explicitly state Service Pattern
   - Add rationale section
   - Remove any CQRS references

3. **Add Architecture Decision Record**
   - Document decision in this requirement
   - Add to project architecture documentation if exists

4. **Code Review**
   - Ensure consistency across codebase
   - Verify no accidental CQRS usage

## 8. References

- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [CQRS Pattern - When to Use](https://martinfowler.com/bliki/CQRS.html)
- [Service Pattern vs CQRS](https://docs.nestjs.com/recipes/cqrs)

---

## 9. Notes

This requirement is primarily **documentation and verification**. The Auth module likely already uses Service Pattern correctly. This requirement ensures:
- The decision is explicitly documented
- Future developers understand why Service Pattern was chosen
- No accidental CQRS migration occurs
- Documentation is consistent with implementation
