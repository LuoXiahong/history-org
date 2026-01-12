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
import { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto';
import { JwtPayload, UserRole } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 12;

  private readonly cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
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
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles,
    };

    const accessToken = this.jwtService.sign(payload);
    res.cookie('access_token', accessToken, this.cookieOptions);

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
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles,
    };

    const accessToken = this.jwtService.sign(payload);
    res.cookie('access_token', accessToken, this.cookieOptions);

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      roles,
    };
  }

  async logout(res: Response): Promise<void> {
    res.clearCookie('access_token', this.cookieOptions);
  }

  validateToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch {
      return null;
    }
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
