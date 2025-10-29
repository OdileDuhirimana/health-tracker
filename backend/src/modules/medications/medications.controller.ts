import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { MedicationsService } from './medications.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { CurrentUser } from '../../common/decorators/user.decorator';

@ApiTags('Medications')
@ApiBearerAuth('JWT-auth')
@Controller('medications')
@UseGuards(JwtAuthGuard)
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create medication', description: 'Admin only - Create a new medication' })
  @ApiResponse({ status: 201, description: 'Medication created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  create(@Body() createMedicationDto: CreateMedicationDto, @CurrentUser() user: any) {
    return this.medicationsService.create(createMedicationDto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all medications', description: 'Get all medications with optional search. Healthcare Staff only see medications from assigned programs.' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or dosage' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50, max: 100)' })
  @ApiResponse({ status: 200, description: 'List of medications retrieved successfully' })
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser() user?: any,
  ) {
    return this.medicationsService.findAll(
      search,
      page ? parseInt(String(page), 10) : undefined,
      limit ? parseInt(String(limit), 10) : undefined,
      user?.role,
      user?.userId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get medication by ID', description: 'Get detailed medication information' })
  @ApiParam({ name: 'id', description: 'Medication UUID' })
  @ApiResponse({ status: 200, description: 'Medication found' })
  @ApiResponse({ status: 404, description: 'Medication not found' })
  findOne(@Param('id') id: string) {
    return this.medicationsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update medication', description: 'Admin only - Update medication information' })
  @ApiParam({ name: 'id', description: 'Medication UUID' })
  @ApiResponse({ status: 200, description: 'Medication updated successfully' })
  @ApiResponse({ status: 404, description: 'Medication not found' })
  update(
    @Param('id') id: string,
    @Body() updateMedicationDto: UpdateMedicationDto,
    @CurrentUser() user: any,
  ) {
    return this.medicationsService.update(id, updateMedicationDto, user.userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete medication', description: 'Admin only - Delete a medication' })
  @ApiParam({ name: 'id', description: 'Medication UUID' })
  @ApiResponse({ status: 200, description: 'Medication deleted successfully' })
  @ApiResponse({ status: 404, description: 'Medication not found' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.medicationsService.remove(id, user.userId);
  }
}
