import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get dashboard metrics', description: 'Get key metrics for dashboard overview. Admin sees all; Healthcare Staff sees only assigned patients.' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully', schema: {
    example: {
      totalPrograms: 8,
      activePatients: 128,
      pendingMedications: 12,
      overdueSessions: 0
    }
  }})
  getMetrics(@CurrentUser() user?: any) {
    return this.dashboardService.getMetrics(user?.role, user?.userId);
  }

  @Get('programs-overview')
  @ApiOperation({ summary: 'Get programs overview', description: 'Get programs with patient enrollment counts. Admin sees all; Healthcare Staff sees only programs with assigned patients.' })
  @ApiResponse({ status: 200, description: 'Programs overview retrieved' })
  getProgramsOverview(@CurrentUser() user?: any) {
    return this.dashboardService.getProgramsOverview(user?.role, user?.userId);
  }

  @Get('attendance-data')
  @ApiOperation({ summary: 'Get attendance data', description: 'Get attendance summary data. Admin sees all; Healthcare Staff sees only assigned patients.' })
  @ApiResponse({ status: 200, description: 'Attendance data retrieved' })
  getAttendanceData(@CurrentUser() user?: any) {
    return this.dashboardService.getAttendanceData(user?.role, user?.userId);
  }

  @Get('adherence-rate')
  @ApiOperation({ summary: 'Get adherence rate', description: 'Get medication adherence rate data. Admin sees all; Healthcare Staff sees only assigned patients.' })
  @ApiResponse({ status: 200, description: 'Adherence rate data retrieved' })
  getAdherenceRate(@CurrentUser() user?: any) {
    return this.dashboardService.getAdherenceRate(user?.role, user?.userId);
  }

  @Get('program-duration-summary')
  @ApiOperation({ summary: 'Get program duration summary', description: 'Get summary of programs with duration, enrollments, and adherence. Admin sees all; Healthcare Staff sees only assigned programs.' })
  @ApiResponse({ status: 200, description: 'Program duration summary retrieved', schema: {
    example: [{
      programName: 'Mental Health Support',
      startDate: '2025-01-01',
      endDate: '2025-03-31',
      expectedEnrollments: 50,
      activePatients: 42,
      adherencePercent: 87
    }]
  }})
  getProgramDurationSummary(@CurrentUser() user?: any) {
    return this.dashboardService.getProgramDurationSummary(user?.role, user?.userId);
  }

  @Get('upcoming-dispensations')
  @ApiOperation({ summary: 'Get upcoming dispensation alerts', description: 'Get list of patients with medications due today or overdue. Admin sees all; Healthcare Staff sees only assigned patients.' })
  @ApiResponse({ status: 200, description: 'Upcoming dispensations retrieved', schema: {
    example: [{
      patientId: 'uuid',
      patientName: 'John Doe',
      programId: 'uuid',
      programName: 'Diabetes Management',
      medicationId: 'uuid',
      medicationName: 'Insulin',
      nextDueDate: '2025-11-03T10:00:00Z',
      status: 'overdue'
    }]
  }})
  getUpcomingDispensations(@CurrentUser() user?: any) {
    return this.dashboardService.getUpcomingDispensations(user?.role, user?.userId);
  }
}
