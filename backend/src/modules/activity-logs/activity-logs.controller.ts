import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityType } from '../../entities/activity-log.entity';

@ApiTags('Activity Logs')
@ApiBearerAuth('JWT-auth')
@Controller('activity-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ActivityLogsController {
  constructor(private activityLogsService: ActivityLogsService) {}

  @Get()
  @ApiOperation({ summary: 'List all activity logs', description: 'Admin only - Get system activity logs with optional filters and pagination. Search applies to all records in backend.' })
  @ApiQuery({ name: 'type', required: false, enum: ActivityType, description: 'Filter by activity type' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user UUID' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by description, user name, or type (searches all records)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50, max: 100)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiResponse({ status: 200, description: 'Activity logs retrieved successfully' })
  async findAll(
    @Query('type') type?: ActivityType,
    @Query('userId') userId?: string,
    @Query('date') date?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.activityLogsService.findAll({
      type,
      userId,
      date,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
    });
  }
}
