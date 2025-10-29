import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '../../../entities/attendance.entity';

export class UpdateAttendanceDto {
  @ApiPropertyOptional({
    example: 'Present',
    enum: AttendanceStatus,
    description: 'Updated attendance status',
  })
  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;

  @ApiPropertyOptional({
    example: '2025-03-11T10:00:00Z',
    description: 'Updated check-in time in ISO 8601 format',
    format: 'date-time',
  })
  @IsDateString()
  @IsOptional()
  checkInTime?: string;

  @ApiPropertyOptional({
    example: 'Updated notes about attendance',
    description: 'Optional notes about the attendance record',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

