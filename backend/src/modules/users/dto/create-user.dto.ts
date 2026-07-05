import { IsEmail, IsNotEmpty, IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../entities/user.entity';
import { IsStrongPassword, PASSWORD_MIN_LENGTH } from '../../../common/validators/is-strong-password.decorator';

export class CreateUserDto {
  @ApiProperty({
    example: 'Jane Smith',
    description: 'Full name of the user',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'jane.smith@healthtrack.app',
    description: 'Email address (must be unique)',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'SecurePassword123',
    description: `Password (minimum ${PASSWORD_MIN_LENGTH} characters; must include uppercase, lowercase, and a number)`,
    minLength: PASSWORD_MIN_LENGTH,
  })
  @IsNotEmpty()
  @IsStrongPassword()
  password: string;

  @ApiPropertyOptional({
    example: 'Healthcare Staff',
    enum: UserRole,
    description: 'Role of the user. Admin can create any role, but typically Healthcare Staff or Guest.',
    default: 'Healthcare Staff',
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    description: 'Array of program UUIDs to assign this user to (for Healthcare Staff role)',
  })
  @IsArray()
  @IsOptional()
  programIds?: string[];
}

