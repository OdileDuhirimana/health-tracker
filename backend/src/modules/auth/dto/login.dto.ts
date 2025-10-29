import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@healthtrack.app', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'admin123', description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'Admin', enum: ['Admin', 'Healthcare Staff', 'Guest'], required: false, description: 'User role (optional - backend determines role from user account)' })
  @IsOptional()
  @IsString()
  role?: string;
}

