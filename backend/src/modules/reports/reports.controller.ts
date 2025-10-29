import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { CurrentUser } from '../../common/decorators/user.decorator';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('patient')
  @ApiOperation({ summary: 'Generate patient progress report', description: 'Admin only - Generate patient progress report for CSV export' })
  @ApiQuery({ name: 'programId', required: false, description: 'Filter by program UUID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Patient report generated' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  generatePatientReport(
    @Query('programId') programId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.reportsService.generatePatientReport({ programId, startDate, endDate }, user?.role, user?.userId);
  }

  @Get('program')
  @ApiOperation({ summary: 'Generate program performance report', description: 'Admin only - Generate program performance report' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Program report generated' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  generateProgramReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.reportsService.generateProgramReport({ startDate, endDate }, user?.role, user?.userId);
  }

  @Get('medication')
  @ApiOperation({ summary: 'Generate medication tracking report', description: 'Admin only - Generate medication tracking report' })
  @ApiResponse({ status: 200, description: 'Medication report generated' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  generateMedicationReport(@CurrentUser() user?: any) {
    return this.reportsService.generateMedicationReport(user?.role, user?.userId);
  }

  @Get('attendance')
  @ApiOperation({ summary: 'Generate attendance summary report', description: 'Admin only - Generate attendance summary report' })
  @ApiQuery({ name: 'programId', required: false, description: 'Filter by program UUID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Attendance report generated' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  generateAttendanceReport(
    @Query('programId') programId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.reportsService.generateAttendanceReport({ programId, startDate, endDate }, user?.role, user?.userId);
  }

  @Get('user')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Generate user activity report', description: 'Admin only - Generate user activity report' })
  @ApiResponse({ status: 200, description: 'User report generated' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only admins can generate user reports' })
  generateUserReport() {
    return this.reportsService.generateUserReport();
  }
}
