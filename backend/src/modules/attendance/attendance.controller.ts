import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceStatus } from '../../entities/attendance.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { CurrentUser } from '../../common/decorators/user.decorator';

@ApiTags('Attendance')
@ApiBearerAuth('JWT-auth')
@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ summary: 'Mark attendance', description: 'Mark attendance for multiple patients in a program (Admin and Healthcare Staff only)' })
  @ApiResponse({ status: 201, description: 'Attendance marked successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Guest users cannot mark attendance' })
  @ApiResponse({ status: 404, description: 'Program not found' })
  create(@Body() createAttendanceDto: CreateAttendanceDto, @CurrentUser() user: any) {
    return this.attendanceService.create(createAttendanceDto, user.userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ summary: 'List all attendance records', description: 'Get all attendance records with optional filters and pagination. Admin sees all; Healthcare Staff sees only assigned patients. Search applies to all records in backend.' })
  @ApiQuery({ name: 'programId', required: false, description: 'Filter by program UUID' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'status', required: false, enum: ['Present', 'Absent', 'Late', 'Excused', 'Canceled'] })
  @ApiQuery({ name: 'search', required: false, description: 'Search by patient name or program name (searches all records)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50, max: 100)' })
  @ApiResponse({ status: 200, description: 'List of attendance records retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Guest users cannot view attendance' })
  findAll(
    @Query('programId') programId?: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser() user?: any,
  ) {
    return this.attendanceService.findAll({ 
      programId, 
      date, 
      status: status as AttendanceStatus | undefined,
      search,
      page: page ? parseInt(String(page), 10) : undefined,
      limit: limit ? parseInt(String(limit), 10) : undefined,
    }, user?.role, user?.userId);
  }

  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ summary: 'Get attendance statistics', description: 'Get attendance statistics and rates. Admin sees all; Healthcare Staff sees only assigned patients.' })
  @ApiQuery({ name: 'programId', required: false, description: 'Filter by program UUID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Attendance statistics retrieved', schema: {
    example: {
      total: 150,
      present: 125,
      absent: 20,
      late: 5,
      excused: 0,
      attendanceRate: 86.67
    }
  }})
  @ApiResponse({ status: 403, description: 'Forbidden - Guest users cannot view attendance statistics' })
  getStatistics(
    @Query('programId') programId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.attendanceService.getStatistics(programId, startDate, endDate, user?.role, user?.userId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ summary: 'Update attendance record', description: 'Update a single attendance record. Admin can update any; Healthcare Staff can only update for assigned patients.' })
  @ApiParam({ name: 'id', description: 'Attendance UUID' })
  @ApiResponse({ status: 200, description: 'Attendance updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Healthcare Staff can only update attendance for assigned patients' })
  @ApiResponse({ status: 404, description: 'Attendance not found' })
  update(
    @Param('id') id: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
    @CurrentUser() user: any,
  ) {
    return this.attendanceService.update(id, updateAttendanceDto, user.userId, user.role);
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ summary: 'Bulk update attendance', description: 'Update multiple attendance records at once (Admin and Healthcare Staff only)' })
  @ApiResponse({ status: 200, description: 'Attendance records updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Guest users cannot update attendance' })
  bulkUpdate(@Body() body: { programId: string; attendanceDate: string; updates: Array<{ id: string; status: string }> }, @CurrentUser() user: any) {
    const updatesWithStatus = body.updates.map(update => ({
      id: update.id,
      status: update.status as AttendanceStatus
    }));
    return this.attendanceService.bulkUpdate(body.programId, body.attendanceDate, updatesWithStatus, user.userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete attendance record', description: 'Admin only - Delete a single attendance record' })
  @ApiParam({ name: 'id', description: 'Attendance UUID' })
  @ApiResponse({ status: 200, description: 'Attendance deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only admins can delete attendance' })
  @ApiResponse({ status: 404, description: 'Attendance not found' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.attendanceService.remove(id, user.userId);
  }
}
