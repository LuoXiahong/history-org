import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  JwtPayload,
  AuthenticatedUser,
  UserRole,
} from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
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

    // Parse roles from JSON string
    const roles = this.parseRoles(user.roles);

    return {
      id: user.id,
      email: user.email,
      roles,
    };
  }

  private parseRoles(rolesJson: string): UserRole[] {
    try {
      const parsed = JSON.parse(rolesJson);
      if (Array.isArray(parsed)) {
        return parsed.filter((r) =>
          Object.values(UserRole).includes(r as UserRole),
        ) as UserRole[];
      }
      return [UserRole.USER];
    } catch {
      return [UserRole.USER];
    }
  }
}
