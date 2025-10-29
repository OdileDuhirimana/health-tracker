import { IsUUID, IsNotEmpty, IsOptional, IsString, IsEnum, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '../../../entities/attendance.entity';

export class PatientAttendanceDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the patient',
  })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({
    example: 'Present',
    enum: AttendanceStatus,
    description: 'Attendance status of the patient',
  })
  @IsEnum(AttendanceStatus)
  @IsNotEmpty()
  status: AttendanceStatus;

  @ApiPropertyOptional({
    example: '2025-03-11T10:00:00Z',
    description: 'ISO 8601 date-time string of patient check-in time',
    format: 'date-time',
  })
  @IsDateString()
  @IsOptional()
  checkInTime?: string;

  @ApiPropertyOptional({
    example: 'Arrived 5 minutes late',
    description: 'Optional notes about the attendance',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateAttendanceDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'UUID of the program for this attendance session',
  })
  @IsUUID()
  @IsNotEmpty()
  programId: string;

  @ApiProperty({
    example: '2025-03-11',
    description: 'Date of the attendance session in YYYY-MM-DD format',
    format: 'date',
  })
  @IsDateString()
  @IsNotEmpty()
  attendanceDate: string;

  @ApiProperty({
    type: [PatientAttendanceDto],
    example: [
      {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'Present',
        checkInTime: '2025-03-11T10:00:00Z',
        notes: 'On time',
      },
      {
        patientId: '550e8400-e29b-41d4-a716-446655440003',
        status: 'Late',
        checkInTime: '2025-03-11T10:15:00Z',
        notes: 'Arrived 15 minutes late',
      },
    ],
    description: 'Array of patient attendance records for this session',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientAttendanceDto)
  @IsNotEmpty()
  attendances: PatientAttendanceDto[];
}

