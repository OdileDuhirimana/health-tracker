import { IsString, IsNotEmpty, IsOptional, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EnrollPatientDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the patient to enroll',
  })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'UUID of the program to enroll the patient in',
  })
  @IsUUID()
  @IsNotEmpty()
  programId: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440002',
    description: 'UUID of the healthcare staff member to assign to this patient enrollment',
  })
  @IsUUID()
  @IsOptional()
  assignedStaffId?: string;

  @ApiPropertyOptional({
    example: '2025-03-11',
    description: 'Date of enrollment in YYYY-MM-DD format. Defaults to current date if not provided.',
    format: 'date',
  })
  @IsDateString()
  @IsOptional()
  enrollmentDate?: string;
}

