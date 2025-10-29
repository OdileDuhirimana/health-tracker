import { IsUUID, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDispensationDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the patient receiving the medication',
  })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'UUID of the medication being dispensed',
  })
  @IsUUID()
  @IsNotEmpty()
  medicationId: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440002',
    description: 'UUID of the program this dispensation is part of',
  })
  @IsUUID()
  @IsNotEmpty()
  programId: string;

  @ApiProperty({
    example: '2025-03-11T10:30:00Z',
    description: 'ISO 8601 date-time string of when the medication was dispensed',
    format: 'date-time',
  })
  @IsDateString()
  @IsNotEmpty()
  dispensedAt: string;

  @ApiPropertyOptional({
    example: 'Patient advised to take with food',
    description: 'Optional notes about the dispensation',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

