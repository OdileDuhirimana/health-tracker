import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MedicationFrequency, MedicationStatus } from '../../../entities/medication.entity';

export class CreateMedicationDto {
  @ApiProperty({
    example: 'Sertraline',
    description: 'Name of the medication',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '50mg',
    description: 'Dosage strength and unit',
  })
  @IsString()
  @IsNotEmpty()
  dosage: string;

  @ApiProperty({
    example: 'daily',
    enum: MedicationFrequency,
    description: 'Frequency of medication administration',
  })
  @IsEnum(MedicationFrequency)
  @IsNotEmpty()
  frequency: MedicationFrequency;

  @ApiPropertyOptional({
    example: 'Active',
    enum: MedicationStatus,
    default: 'Active',
    description: 'Status of the medication',
  })
  @IsEnum(MedicationStatus)
  @IsOptional()
  status?: MedicationStatus;

  @ApiPropertyOptional({
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    description: 'Array of program UUIDs to assign this medication to',
  })
  @IsArray()
  @IsOptional()
  programIds?: string[];

  @ApiPropertyOptional({
    example: 'Mental Health',
    description: 'Filter programs by type when assigning medication. If provided, only programs of this type will be available for assignment.',
  })
  @IsString()
  @IsOptional()
  programType?: string;
}

