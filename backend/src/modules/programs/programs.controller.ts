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
import { ProgramsService } from './programs.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { CurrentUser } from '../../common/decorators/user.decorator';

@ApiTags('Programs')
@ApiBearerAuth('JWT-auth')
@Controller('programs')
@UseGuards(JwtAuthGuard)
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create program', description: 'Admin only - Create a new health program' })
  @ApiResponse({ status: 201, description: 'Program created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  create(@Body() createProgramDto: CreateProgramDto, @CurrentUser() user: any) {
    return this.programsService.create(createProgramDto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all programs', description: 'Get all programs with optional filters. Guest users can only view active (public) programs without patient data.' })
  @ApiQuery({ name: 'type', required: false, enum: ['Mental Health', 'Vaccination', 'Diabetes', 'Other'] })
  @ApiQuery({ name: 'status', required: false, enum: ['Active', 'Inactive'] })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or description' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50, max: 100)' })
  @ApiResponse({ status: 200, description: 'List of programs retrieved successfully. Guest users receive programs without patient enrollment data.' })
  findAll(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser() user?: any,
  ) {
    return this.programsService.findAll({ 
      type, 
      status, 
      search, 
      startDate, 
      endDate,
      page: page ? parseInt(String(page), 10) : undefined,
      limit: limit ? parseInt(String(limit), 10) : undefined,
    }, user?.role, user?.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get program by ID', description: 'Get detailed program information. Guest users can only view active programs without patient enrollment data.' })
  @ApiParam({ name: 'id', description: 'Program UUID' })
  @ApiResponse({ status: 200, description: 'Program found. Guest users receive program without patient data.' })
  @ApiResponse({ status: 404, description: 'Program not found or not accessible (Guest users can only access active programs)' })
  findOne(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.programsService.findOne(id, user?.role);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update program', description: 'Admin only - Update program information' })
  @ApiParam({ name: 'id', description: 'Program UUID' })
  @ApiResponse({ status: 200, description: 'Program updated successfully' })
  @ApiResponse({ status: 404, description: 'Program not found' })
  update(
    @Param('id') id: string,
    @Body() updateProgramDto: UpdateProgramDto,
    @CurrentUser() user: any,
  ) {
    return this.programsService.update(id, updateProgramDto, user.userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete program', description: 'Admin only - Delete a program' })
  @ApiParam({ name: 'id', description: 'Program UUID' })
  @ApiResponse({ status: 200, description: 'Program deleted successfully' })
  @ApiResponse({ status: 404, description: 'Program not found' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.programsService.remove(id, user.userId);
  }
}

