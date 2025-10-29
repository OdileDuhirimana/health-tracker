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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { EnrollPatientDto } from './dto/enroll-patient.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { CurrentUser } from '../../common/decorators/user.decorator';

@ApiTags('Patients')
@ApiBearerAuth('JWT-auth')
@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ summary: 'Create new patient', description: 'Create a new patient record (Admin and Healthcare Staff only)' })
  @ApiResponse({ status: 201, description: 'Patient created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Guest users cannot create patients' })
  create(@Body() createPatientDto: CreatePatientDto, @CurrentUser() user: any) {
    return this.patientsService.create(createPatientDto, user.userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ summary: 'List all patients', description: 'Get all patients with optional filters. Admin sees all; Healthcare Staff sees only assigned patients.' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, ID, email, or phone' })
  @ApiQuery({ name: 'programId', required: false, description: 'Filter by program UUID' })
  @ApiQuery({ name: 'status', required: false, enum: ['Active', 'Inactive'] })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50, max: 100)' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['progress', 'adherence'], description: 'Sort by progress or adherence rate' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], description: 'Sort order (default: DESC)' })
  @ApiResponse({ status: 200, description: 'List of patients retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Guest users cannot view patient data' })
  findAll(
    @Query('search') search?: string,
    @Query('programId') programId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @CurrentUser() user?: any,
  ) {
    return this.patientsService.findAll(
      {
        search,
        programId,
        status,
        page: page ? parseInt(String(page), 10) : undefined,
        limit: limit ? parseInt(String(limit), 10) : undefined,
        sortBy,
        sortOrder,
      },
      user?.role,
      user?.userId,
    );
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ summary: 'Get patient by ID', description: 'Get detailed patient information. Admin sees all; Healthcare Staff sees only assigned patients.' })
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: 'Patient found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Guest users cannot view patient data or patient not assigned to staff' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  findOne(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.patientsService.findOne(id, user?.role, user?.userId);
  }

  @Get(':id/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ summary: 'Get patient statistics', description: 'Get patient statistics and progress. Admin sees all; Healthcare Staff sees only assigned patients.' })
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: 'Patient statistics retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden - Guest users cannot view patient statistics or patient not assigned to staff' })
  getStats(@Param('id') id: string, @CurrentUser() user?: any) {
    // First verify access
    return this.patientsService.findOne(id, user?.role, user?.userId).then(() => {
      return this.patientsService.getPatientStats(id);
    });
  }

  @Post(':id/enroll')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ summary: 'Enroll patient in program', description: 'Enroll a patient in a health program. Admin can assign staff; Healthcare Staff can enroll but cannot assign staff.' })
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: 'Patient enrolled successfully' })
  @ApiResponse({ status: 400, description: 'Patient already enrolled in this program' })
  @ApiResponse({ status: 403, description: 'Forbidden - Guest users cannot enroll patients' })
  enroll(@Body() enrollPatientDto: EnrollPatientDto, @CurrentUser() user: any) {
    return this.patientsService.enroll(enrollPatientDto, user.userId, user.role);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ summary: 'Update patient', description: 'Update patient information. Admin can update all; Healthcare Staff can only update assigned patients.' })
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: 'Patient updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Guest users cannot update patients or patient not assigned to staff' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  update(
    @Param('id') id: string,
    @Body() updatePatientDto: UpdatePatientDto,
    @CurrentUser() user: any,
  ) {
    return this.patientsService.update(id, updatePatientDto, user.userId, user.role);
  }

  @Delete(':id/programs/:programId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove patient from program', description: 'Admin only - Remove a patient from a health program' })
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiParam({ name: 'programId', description: 'Program UUID' })
  @ApiResponse({ status: 200, description: 'Patient removed from program successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only admins can remove patients from programs' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  removeFromProgram(
    @Param('id') id: string,
    @Param('programId') programId: string,
    @CurrentUser() user: any,
  ) {
    return this.patientsService.removeFromProgram(id, programId, user.userId);
  }

  @Patch(':id/programs/:programId/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ summary: 'Mark program as completed', description: 'Mark a patient\'s program as completed. Admin can mark any program; Healthcare Staff can only mark programs for assigned patients.' })
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiParam({ name: 'programId', description: 'Program UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        completionNotes: { type: 'string', description: 'Optional notes about program completion' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Program marked as completed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Healthcare Staff can only mark programs for assigned patients' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  @ApiResponse({ status: 400, description: 'Program is already completed' })
  markProgramCompleted(
    @Param('id') id: string,
    @Param('programId') programId: string,
    @Body() body: { completionNotes?: string },
    @CurrentUser() user: any,
  ) {
    return this.patientsService.markProgramCompleted(
      id,
      programId,
      body.completionNotes || '',
      user.userId,
      user.role,
    );
  }

  @Get('missed-sessions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ summary: 'Get patients with missed sessions', description: 'Get list of patients who have missed sessions. Flags patients based on expected vs actual attendance.' })
  @ApiResponse({ status: 200, description: 'Patients with missed sessions retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Guest users cannot view patient data' })
  getPatientsWithMissedSessions(
    @Query('programId') programId?: string,
    @CurrentUser() user?: any,
  ) {
    return this.patientsService.getPatientsWithMissedSessions(programId, user?.role, user?.userId);
  }

  @Get(':id/missed-sessions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ summary: 'Get missed sessions for a patient', description: 'Get detailed information about missed sessions for a specific patient' })
  @ApiParam({ name: 'id', description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: 'Missed sessions retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  getPatientMissedSessions(
    @Param('id') id: string,
    @CurrentUser() user?: any,
  ) {
    return this.patientsService.getPatientMissedSessions(id, user?.role, user?.userId);
  }
}
