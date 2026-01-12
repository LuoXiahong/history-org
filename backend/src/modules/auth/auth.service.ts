import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserResponseDto } from './dto/auth-response.dto';
import { JwtPayload, UserRole } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 12;

  private readonly cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto, res: Response): Promise<UserResponseDto> {
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

    const roles = this.parseRoles(user.roles);
    const token = this.generateToken({
      id: user.id,
      email: user.email,
      roles,
    });

    const maxAge = this.getExpirationSeconds() * 1000;
    res.cookie('access_token', token, {
      ...this.cookieOptions,
      maxAge,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      roles,
    };
  }

  async register(dto: RegisterDto, res: Response): Promise<UserResponseDto> {
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
        roles: JSON.stringify([UserRole.USER]),
        isActive: true,
      },
    });

    this.logger.log(`New user registered: ${user.id}`);

    const roles = [UserRole.USER];
    const token = this.generateToken({
      id: user.id,
      email: user.email,
      roles,
    });

    const maxAge = this.getExpirationSeconds() * 1000;
    res.cookie('access_token', token, {
      ...this.cookieOptions,
      maxAge,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      roles,
    };
  }

  logout(res: Response): void {
    // Clear cookie with exact same options as when it was set
    // Express requires matching options for clearCookie to work properly
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      // Explicitly set domain to undefined/null if not set originally
      // This ensures cookie is cleared from the same domain it was set
    });
  }

  validateToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  private generateToken(user: {
    id: string;
    email: string;
    roles: UserRole[];
  }): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    return this.jwtService.sign(payload);
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

  private parseRoles(rolesJson: string): UserRole[] {
    try {
      const parsed: unknown = JSON.parse(rolesJson);
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
