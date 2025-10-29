import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, PatientStatus } from '../../../entities/patient.entity';

export class CreatePatientDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the patient',
  })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({
    example: '1990-01-15',
    description: 'Date of birth in YYYY-MM-DD format',
    format: 'date',
  })
  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string;

  @ApiProperty({
    example: 'Male',
    enum: Gender,
    description: 'Gender of the patient',
  })
  @IsEnum(Gender)
  @IsNotEmpty()
  gender: Gender;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'Contact phone number',
  })
  @IsString()
  @IsOptional()
  contactNumber?: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'Email address of the patient',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: '123 Main Street, City, State 12345',
    description: 'Physical address of the patient',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    example: 'Jane Doe - +1987654321',
    description: 'Emergency contact information',
  })
  @IsString()
  @IsOptional()
  emergencyContact?: string;

  @ApiPropertyOptional({
    example: 'Allergic to penicillin. History of hypertension.',
    description: 'Medical notes and important information about the patient',
  })
  @IsString()
  @IsOptional()
  medicalNotes?: string;

  @ApiPropertyOptional({
    example: 'Active',
    enum: PatientStatus,
    default: 'Active',
    description: 'Status of the patient record',
  })
  @IsEnum(PatientStatus)
  @IsOptional()
  status?: PatientStatus;
}

