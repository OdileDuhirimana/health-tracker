import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Program } from '../../entities/program.entity';
import { Medication } from '../../entities/medication.entity';
import { User, UserRole } from '../../entities/user.entity';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ActivityType } from '../../entities/activity-log.entity';

@Injectable()
export class ProgramsService {
  constructor(
    @InjectRepository(Program)
    private programRepository: Repository<Program>,
    @InjectRepository(Medication)
    private medicationRepository: Repository<Medication>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private activityLogsService: ActivityLogsService,
  ) {}

  async create(createProgramDto: CreateProgramDto, userId: string) {
    const program = this.programRepository.create({
      name: createProgramDto.name,
      type: createProgramDto.type,
      description: createProgramDto.description,
      status: createProgramDto.status,
      sessionFrequency: createProgramDto.sessionFreq,
      components: createProgramDto.components,
    });

    if (createProgramDto.medicationIds && createProgramDto.medicationIds.length > 0) {
      const medications = await this.medicationRepository.findBy({
        id: In(createProgramDto.medicationIds),
      });
      
      const mismatchedMedications = medications.filter(
        (med) => med.programType && med.programType !== createProgramDto.type
      );
      
      if (mismatchedMedications.length > 0) {
        throw new BadRequestException(
          `Cannot assign medications to program: ${mismatchedMedications.map(m => m.name).join(', ')} have program type mismatch.`
        );
      }
      
      program.medications = medications;
    }

    if (createProgramDto.staffIds && createProgramDto.staffIds.length > 0) {
      const staff = await this.userRepository.findBy({
        id: In(createProgramDto.staffIds),
        role: UserRole.HEALTHCARE_STAFF,
      });
      
      if (staff.length !== createProgramDto.staffIds.length) {
        throw new BadRequestException('One or more staff members not found or not Healthcare Staff');
      }
      
      program.assignedStaff = staff;
    }

    const savedProgram = await this.programRepository.save(program);

    await this.activityLogsService.create(
      ActivityType.PROGRAM,
      `Created program: ${savedProgram.name}`,
      userId,
      { programId: savedProgram.id },
    );

    return this.findOne(savedProgram.id);
  }

  async findAll(filters?: {
    type?: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }, userRole?: string, userId?: string) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 100); // Cap at 100 per page
    const skip = (page - 1) * limit;

    // For Healthcare Staff, get assigned program IDs to mark them in response
    let assignedProgramIds: string[] = [];
    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      const assignedProgramsQuery = this.programRepository
        .createQueryBuilder('program')
        .select('DISTINCT program.id', 'id')
        .innerJoin('user_programs', 'up', 'up.programsId = program.id')
        .where('up.usersId = :userId', { userId });
      
      const results = await assignedProgramsQuery.getRawMany();
      assignedProgramIds = results.map((r) => r.id);
    }

    const query = this.programRepository
      .createQueryBuilder('program')
      .leftJoinAndSelect('program.medications', 'medications')
      .leftJoinAndSelect('program.assignedStaff', 'assignedStaff');

    // Only include patient enrollment count for non-Guest users
    if (userRole !== UserRole.GUEST) {
      query.loadRelationCountAndMap('program.totalPatients', 'program.enrollments');
    }

    // Guest users should only see active programs (public health programs)
    if (userRole === UserRole.GUEST) {
      query.andWhere('program.status = :status', { status: 'Active' });
    }

    // Apply filters for all users (Healthcare Staff can view all programs, but filters still apply)
    if (filters?.type) {
      query.andWhere('program.type = :type', { type: filters.type });
    }

    if (filters?.status && userRole !== UserRole.GUEST) {
      // Guest users cannot filter by status (they only see active programs)
      query.andWhere('program.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      query.andWhere(
        '(program.name ILIKE :search OR program.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.startDate && filters?.endDate) {
      query.andWhere('program.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    // Get all programs (Healthcare Staff can view all, but only interact with assigned ones)
    const [data, totalCount] = await query
      .orderBy('program.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
    
    const total = totalCount;
    
    // Mark assigned programs for Healthcare Staff (frontend can use this to show which programs they manage)
    if (userRole === UserRole.HEALTHCARE_STAFF && userId && assignedProgramIds.length > 0) {
      data.forEach((program) => {
        (program as any).isAssigned = assignedProgramIds.includes(program.id);
      });
    }

    // For Guest users, remove any patient-related data
    if (userRole === UserRole.GUEST) {
      data.forEach((program) => {
        // Remove enrollments relation data if loaded
        delete (program as any).enrollments;
        delete (program as any).totalPatients;
        // Keep only basic program info and medications (but no patient assignments)
      });
    }

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userRole?: string) {
    const query = this.programRepository
      .createQueryBuilder('program')
      .leftJoinAndSelect('program.medications', 'medications')
      .leftJoinAndSelect('program.assignedStaff', 'assignedStaff')
      .where('program.id = :id', { id });

    // Guest users should only see active programs (public health programs)
    if (userRole === UserRole.GUEST) {
      query.andWhere('program.status = :status', { status: 'Active' });
    }

    // Only include enrollments for non-Guest users
    if (userRole !== UserRole.GUEST) {
      query.leftJoinAndSelect('program.enrollments', 'enrollments');
    }

    const program = await query.getOne();

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    // For Guest users, remove any patient-related data
    if (userRole === UserRole.GUEST) {
      delete (program as any).enrollments;
      // Ensure no patient data is exposed
    }

    return program;
  }

  async update(id: string, updateProgramDto: UpdateProgramDto, userId: string) {
    const program = await this.programRepository.findOne({
      where: { id },
      relations: ['medications', 'assignedStaff'],
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    // Handle medication assignments
    if (updateProgramDto.medicationIds !== undefined) {
      if (updateProgramDto.medicationIds.length > 0) {
      const medications = await this.medicationRepository.findBy({
        id: In(updateProgramDto.medicationIds),
      });
      
      // Validate that medications match program type
      const mismatchedMedications = medications.filter(
        (med) => med.programType && med.programType !== program.type
      );
      
      if (mismatchedMedications.length > 0) {
        throw new BadRequestException(
          `Cannot assign medications to program: ${mismatchedMedications.map(m => m.name).join(', ')} have program type mismatch.`
        );
      }
      
      program.medications = medications;
      } else {
        program.medications = [];
      }
      delete updateProgramDto.medicationIds;
    }

    // Handle staff assignments
    if (updateProgramDto.staffIds !== undefined) {
      if (updateProgramDto.staffIds.length > 0) {
        const staff = await this.userRepository.findBy({
          id: In(updateProgramDto.staffIds),
          role: UserRole.HEALTHCARE_STAFF,
        });
        
        if (staff.length !== updateProgramDto.staffIds.length) {
          throw new BadRequestException('One or more staff members not found or not Healthcare Staff');
        }
        
        program.assignedStaff = staff;
      } else {
        program.assignedStaff = [];
      }
      delete updateProgramDto.staffIds;
    }

    // Handle components
    if (updateProgramDto.components !== undefined) {
      program.components = updateProgramDto.components;
      delete updateProgramDto.components;
    }

    // Handle session frequency (map sessionFreq to sessionFrequency)
    if (updateProgramDto.sessionFreq !== undefined) {
      program.sessionFrequency = updateProgramDto.sessionFreq;
      delete updateProgramDto.sessionFreq;
    }

    // Update other fields
    Object.assign(program, updateProgramDto);
    const savedProgram = await this.programRepository.save(program);

    await this.activityLogsService.create(
      ActivityType.PROGRAM,
      `Updated program: ${savedProgram.name}`,
      userId,
      { programId: savedProgram.id },
    );

    return this.findOne(savedProgram.id);
  }

  async remove(id: string, userId: string) {
    const program = await this.programRepository.findOne({ where: { id } });
    if (!program) {
      throw new NotFoundException('Program not found');
    }

    await this.programRepository.remove(program);

    await this.activityLogsService.create(
      ActivityType.PROGRAM,
      `Deleted program: ${program.name}`,
      userId,
      { programId: id },
    );

    return { message: 'Program deleted successfully' };
  }
}

