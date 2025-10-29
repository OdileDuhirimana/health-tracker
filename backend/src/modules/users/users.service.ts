import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from '../../entities/user.entity';
import { Program } from '../../entities/program.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ActivityType } from '../../entities/activity-log.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Program)
    private programRepository: Repository<Program>,
    private activityLogsService: ActivityLogsService,
  ) {}

  async create(createUserDto: CreateUserDto, createdBy: string) {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    if (createUserDto.programIds !== undefined && savedUser.role === UserRole.HEALTHCARE_STAFF) {
      if (createUserDto.programIds.length > 0) {
        const programs = await this.programRepository.findBy({
          id: In(createUserDto.programIds),
        });
        savedUser.assignedPrograms = programs;
      } else {
        savedUser.assignedPrograms = [];
      }
      await this.userRepository.save(savedUser);
    }

    await this.activityLogsService.create(
      ActivityType.USER,
      `Created user: ${savedUser.name}`,
      createdBy,
      { userId: savedUser.id, email: savedUser.email },
    );

    const { password: _, ...result } = savedUser;
    return result;
  }

  async findAll(search?: string, page?: number, limit?: number) {
    const pageNum = page || 1;
    const limitNum = Math.min(limit || 50, 100);
    const skip = (pageNum - 1) * limitNum;

    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.assignedPrograms', 'programs');

    if (search) {
      query.where(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    return {
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['assignedPrograms'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async update(id: string, updateUserDto: UpdateUserDto, updatedBy: string) {
    const user = await this.userRepository.findOne({ 
      where: { id },
      relations: ['assignedPrograms'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.programIds !== undefined) {
      if (updateUserDto.programIds.length > 0 && user.role === UserRole.HEALTHCARE_STAFF) {
        const programs = await this.programRepository.findBy({
          id: In(updateUserDto.programIds),
        });
        user.assignedPrograms = programs;
      } else {
        user.assignedPrograms = [];
      }
      delete updateUserDto.programIds;
    }

    Object.assign(user, updateUserDto);
    const savedUser = await this.userRepository.save(user);

    await this.activityLogsService.create(
      ActivityType.USER,
      `Updated user: ${savedUser.name}`,
      updatedBy,
      { userId: savedUser.id },
    );

    const { password: _, ...result } = savedUser;
    return result;
  }

  async remove(id: string, deletedBy: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.remove(user);

    await this.activityLogsService.create(
      ActivityType.USER,
      `Deleted user: ${user.name}`,
      deletedBy,
      { userId: id },
    );

    return { message: 'User deleted successfully' };
  }

  async assignPrograms(userId: string, programIds: string[]) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['assignedPrograms'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}

