import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { DispensationsService } from './dispensations.service';
import { CreateDispensationDto } from './dto/create-dispensation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { CurrentUser } from '../../common/decorators/user.decorator';

@ApiTags('Dispensations')
@ApiBearerAuth('JWT-auth')
@Controller('dispensations')
@UseGuards(JwtAuthGuard)
export class DispensationsController {
  constructor(private readonly dispensationsService: DispensationsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ 
    summary: 'Record medication dispensation', 
    description: 'Record a medication dispensation with automatic duplicate prevention based on frequency (daily/monthly) - Admin and Healthcare Staff only' 
  })
  @ApiResponse({ status: 201, description: 'Dispensation recorded successfully' })
  @ApiResponse({ status: 400, description: 'Duplicate dispensation prevented - already dispensed within frequency window' })
  @ApiResponse({ status: 403, description: 'Forbidden - Guest users cannot record dispensations' })
  @ApiResponse({ status: 404, description: 'Patient, medication, or program not found' })
  create(@Body() createDispensationDto: CreateDispensationDto, @CurrentUser() user: any) {
    return this.dispensationsService.create(createDispensationDto, user.userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ summary: 'List all dispensations', description: 'Get all medication dispensations with optional filters. Admin sees all; Healthcare Staff sees only assigned patients.' })
  @ApiQuery({ name: 'patientId', required: false, description: 'Filter by patient UUID' })
  @ApiQuery({ name: 'programId', required: false, description: 'Filter by program UUID' })
  @ApiQuery({ name: 'medicationId', required: false, description: 'Filter by medication UUID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (ISO format)' })
  @ApiResponse({ status: 200, description: 'List of dispensations retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Guest users cannot view dispensations' })
  findAll(
    @Query('patientId') patientId?: string,
    @Query('programId') programId?: string,
    @Query('medicationId') medicationId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.dispensationsService.findAll({ patientId, programId, medicationId, startDate, endDate }, user?.role, user?.userId);
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ summary: 'Get pending dispensations', description: 'Get list of medications pending dispensation (Admin and Healthcare Staff only)' })
  @ApiResponse({ status: 200, description: 'Pending dispensations retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden - Guest users cannot view pending dispensations' })
  getPending() {
    return this.dispensationsService.getPendingDispensations();
  }

  @Get('overdue/count')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ summary: 'Get overdue medications count', description: 'Get count of overdue medication dispensations. Admin sees all; Healthcare Staff sees only assigned patients.' })
  @ApiResponse({ status: 200, description: 'Overdue count retrieved', schema: { example: { count: 5 } } })
  @ApiResponse({ status: 403, description: 'Forbidden - Guest users cannot view overdue count' })
  getOverdueCount(@CurrentUser() user?: any) {
    return this.dispensationsService.getOverdueCount(user?.role, user?.userId);
  }

  @Get('overdue/details')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ summary: 'Get overdue medications details', description: 'Get detailed list of all overdue medication dispensations. Admin sees all; Healthcare Staff sees only assigned patients.' })
  @ApiResponse({ status: 200, description: 'Overdue medications details retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden - Guest users cannot view overdue details' })
  getOverdueDetails(@CurrentUser() user?: any) {
    return this.dispensationsService.getOverdueDetails(user?.role, user?.userId);
  }

  @Get('tracking-table')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ summary: 'Get medication tracking table', description: 'Get comprehensive medication tracking table with adherence rates. Admin sees all; Healthcare Staff sees only assigned patients.' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 100, max: 500)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by patient, medication, or program name' })
  @ApiResponse({ status: 200, description: 'Medication tracking table retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden - Guest users cannot view tracking table' })
  getTrackingTable(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @CurrentUser() user?: any,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 500) : 100;
    return this.dispensationsService.getMedicationTrackingTable(user?.role, user?.userId, pageNum, limitNum, search);
  }

  @Get('patient/:patientId/history')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ summary: 'Get patient medication history', description: 'Get complete medication dispensation history for a patient. Admin sees all; Healthcare Staff sees only assigned patients.' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: 'Patient medication history retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden - Guest users cannot view patient history or patient not assigned to staff' })
  getPatientHistory(@Param('patientId') patientId: string, @CurrentUser() user?: any) {
    return this.dispensationsService.getPatientHistory(patientId, user?.role, user?.userId);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEALTHCARE_STAFF)
  @ApiOperation({ summary: 'Get dispensation by ID', description: 'Get detailed dispensation information (Admin and Healthcare Staff only)' })
  @ApiParam({ name: 'id', description: 'Dispensation UUID' })
  @ApiResponse({ status: 200, description: 'Dispensation found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Guest users cannot view dispensations' })
  @ApiResponse({ status: 404, description: 'Dispensation not found' })
  findOne(@Param('id') id: string) {
    return this.dispensationsService.findOne(id);
  }
}
