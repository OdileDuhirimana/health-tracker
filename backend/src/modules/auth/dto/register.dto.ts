import { IsEmail, IsNotEmpty, IsString, IsEnum, IsIn, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../entities/user.entity';

// Allowed roles for registration (Admin cannot be registered via signup)
export const ALLOWED_REGISTRATION_ROLES = [
  UserRole.HEALTHCARE_STAFF,
  UserRole.GUEST,
] as const;

export class RegisterDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Password (min 6 characters)' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ 
    example: 'Healthcare Staff', 
    enum: ALLOWED_REGISTRATION_ROLES, 
    required: false,
    description: 'User role - Only Healthcare Staff or Guest allowed. Admin accounts cannot be created via registration. Defaults to Healthcare Staff if not provided.',
    default: 'Healthcare Staff'
  })
  @IsEnum(UserRole, { message: 'Role must be either "Healthcare Staff" or "Guest". Admin role cannot be created via registration.' })
  @IsIn(ALLOWED_REGISTRATION_ROLES, { message: 'Role must be either "Healthcare Staff" or "Guest". Admin accounts can only be created by system administrators.' })
  role?: UserRole.HEALTHCARE_STAFF | UserRole.GUEST;
}

