export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
}

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  roles: UserRole[];
  iat?: number; // Issued at
  exp?: number; // Expiration
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: UserRole[];
}
