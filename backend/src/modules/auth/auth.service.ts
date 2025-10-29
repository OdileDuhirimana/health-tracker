import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from '../../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto, ALLOWED_REGISTRATION_ROLES } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'Active') {
      throw new UnauthorizedException('Account is inactive');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    // If role is provided in login, verify it matches
    if (loginDto.role && user.role !== loginDto.role) {
      throw new UnauthorizedException('Role mismatch');
    }

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new UnauthorizedException('Email already exists');
    }

    // Default to Healthcare Staff if no role provided
    const requestedRole: UserRole = registerDto.role || UserRole.HEALTHCARE_STAFF;
    if (!ALLOWED_REGISTRATION_ROLES.includes(requestedRole as UserRole.HEALTHCARE_STAFF | UserRole.GUEST)) {
      throw new BadRequestException(`Invalid role for registration. Only "${UserRole.HEALTHCARE_STAFF}" or "${UserRole.GUEST}" roles are allowed. Admin accounts can only be created by system administrators.`);
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      name: registerDto.name,
      email: registerDto.email,
      password: hashedPassword,
      role: requestedRole, // Guaranteed to be Healthcare Staff or Guest
      status: UserStatus.ACTIVE, // New registrations are active by default
    });

    const savedUser = await this.userRepository.save(user);
    const { password: _, ...result } = savedUser;

    return result;
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['assignedPrograms'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async updateProfile(userId: string, updateData: { name?: string; password?: string; currentPassword?: string }) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // If password update is requested, verify current password
    if (updateData.password) {
      if (!updateData.currentPassword) {
        throw new BadRequestException('Current password is required to change password');
      }
      const isCurrentPasswordValid = await bcrypt.compare(updateData.currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }
      // Hash new password
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // Update user fields
    if (updateData.name) {
      user.name = updateData.name;
    }
    if (updateData.password) {
      user.password = updateData.password;
    }

    const savedUser = await this.userRepository.save(user);
    const { password: _, ...result } = savedUser;
    return result;
  }
}

