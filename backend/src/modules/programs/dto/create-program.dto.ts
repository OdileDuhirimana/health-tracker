import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgramType, ProgramStatus, SessionFrequency } from '../../../entities/program.entity';

export class ProgramComponentDto {
  @ApiProperty({
    example: 'session',
    enum: ['session', 'consultation', 'group_discussion'],
    description: 'Type of program component',
  })
  @IsIn(['session', 'consultation', 'group_discussion'])
  @IsNotEmpty()
  type: 'session' | 'consultation' | 'group_discussion';

  @ApiProperty({
    example: 'Individual Therapy Session',
    description: 'Name of the program component',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'One-on-one therapy session with licensed therapist',
    description: 'Optional description of the component',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateProgramDto {
  @ApiProperty({
    example: 'Mental Health Support Program',
    description: 'Name of the health program',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Mental Health',
    enum: ProgramType,
    description: 'Type/category of the program',
  })
  @IsEnum(ProgramType)
  @IsNotEmpty()
  type: ProgramType;

  @ApiPropertyOptional({
    example: 'Comprehensive mental health support program for patients',
    description: 'Detailed description of the program',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 'Active',
    enum: ProgramStatus,
    default: 'Active',
    description: 'Status of the program',
  })
  @IsEnum(ProgramStatus)
  @IsOptional()
  status?: ProgramStatus;

  @ApiPropertyOptional({
    example: 'weekly',
    enum: SessionFrequency,
    default: 'weekly',
    description: 'Frequency of program sessions',
  })
  @IsEnum(SessionFrequency)
  @IsOptional()
  sessionFreq?: SessionFrequency;

  @ApiPropertyOptional({
    type: [ProgramComponentDto],
    example: [
      { type: 'session', name: 'Individual Therapy', description: 'One-on-one sessions' },
      { type: 'consultation', name: 'Medical Consultation', description: 'Regular check-ups' },
    ],
    description: 'Array of program components (sessions, consultations, group discussions)',
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProgramComponentDto)
  components?: ProgramComponentDto[];

  @ApiPropertyOptional({
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    description: 'Array of medication UUIDs to assign to this program',
  })
  @IsArray()
  @IsOptional()
  medicationIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440001'],
    description: 'Array of staff member UUIDs to assign to this program',
  })
  @IsArray()
  @IsOptional()
  staffIds?: string[];
}

