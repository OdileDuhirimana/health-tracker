import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog, ActivityType } from '../../entities/activity-log.entity';

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectRepository(ActivityLog)
    private activityLogRepository: Repository<ActivityLog>,
  ) {}

  async create(
    type: ActivityType,
    description: string,
    userId: string,
    metadata?: Record<string, any>,
  ) {
    const activity = this.activityLogRepository.create({
      type,
      description,
      userId,
      metadata,
    });
    return this.activityLogRepository.save(activity);
  }

  async findAll(filters?: {
    type?: ActivityType;
    userId?: string;
    date?: string;
    search?: string;
    limit?: number;
    page?: number;
  }) {
    const limit = Math.min(filters?.limit || 50, 100);
    const page = filters?.page || 1;
    const skip = (page - 1) * limit;

    const query = this.activityLogRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.user', 'user')
      .orderBy('activity.timestamp', 'DESC');

    if (filters?.type) {
      query.andWhere('activity.type = :type', { type: filters.type });
    }

    if (filters?.userId) {
      query.andWhere('activity.userId = :userId', { userId: filters.userId });
    }

    if (filters?.date) {
      query.andWhere('DATE(activity.timestamp) = :date', { date: filters.date });
    }

    if (filters?.search) {
      query.andWhere(
        '(activity.description ILIKE :search OR user.name ILIKE :search OR CAST(activity.type AS TEXT) ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    const [activities, total] = await query
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: activities.map((activity) => ({
        ...activity,
        user: activity.user ? activity.user.name : undefined,
        userEmail: activity.user ? activity.user.email : undefined,
        createdAt: activity.timestamp,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

