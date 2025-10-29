import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Medication, MedicationStatus } from '../../entities/medication.entity';
import { Program } from '../../entities/program.entity';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ActivityType } from '../../entities/activity-log.entity';

@Injectable()
export class MedicationsService {
  constructor(
    @InjectRepository(Medication)
    private medicationRepository: Repository<Medication>,
    @InjectRepository(Program)
    private programRepository: Repository<Program>,
    private activityLogsService: ActivityLogsService,
  ) {}

  async generateMedicationId(): Promise<string> {
    const lastMedication = await this.medicationRepository
      .createQueryBuilder('medication')
      .where("medication.medicationId LIKE 'M-%'")
      .orderBy('medication.medicationId', 'DESC')
      .getOne();

    if (!lastMedication) {
      return 'M-001';
    }

    const lastNumber = parseInt(lastMedication.medicationId.replace('M-', ''));
    return `M-${String(lastNumber + 1).padStart(3, '0')}`;
  }

  async create(createMedicationDto: CreateMedicationDto, userId: string) {
    const medicationId = await this.generateMedicationId();
    const medication = this.medicationRepository.create({
      name: createMedicationDto.name,
      dosage: createMedicationDto.dosage,
      frequency: createMedicationDto.frequency,
      status: createMedicationDto.status || MedicationStatus.ACTIVE,
      programType: createMedicationDto.programType,
      medicationId,
    });

    const savedMedication = await this.medicationRepository.save(medication);

    if (createMedicationDto.programIds && createMedicationDto.programIds.length > 0) {
      const programs = await this.programRepository.findBy({
        id: In(createMedicationDto.programIds),
      });
      savedMedication.programs = programs;
      await this.medicationRepository.save(savedMedication);
    }

    await this.activityLogsService.create(
      ActivityType.MEDICATION,
      `Created medication: ${savedMedication.name} ${savedMedication.dosage}`,
      userId,
      { medicationId: savedMedication.id },
    );

    return this.findOne(savedMedication.id);
  }

  async findAll(search?: string, page?: number, limit?: number, userRole?: string, userId?: string) {
    const pageNum = page || 1;
    const limitNum = Math.min(limit || 50, 100);
    const skip = (pageNum - 1) * limitNum;

    const query = this.medicationRepository
      .createQueryBuilder('medication')
      .leftJoinAndSelect('medication.programs', 'programs');

    let medicationIds: string[] | undefined;
    if (userRole === 'Healthcare Staff' && userId) {
      const subQuery = this.medicationRepository
        .createQueryBuilder('medication')
        .select('DISTINCT medication.id', 'id')
        .innerJoin('program_medications', 'pm', 'pm.medicationsId = medication.id')
        .innerJoin('user_programs', 'up', 'up.programsId = pm.programsId')
        .where('up.usersId = :userId', { userId });
      
      if (search) {
        subQuery.andWhere(
          '(medication.name ILIKE :search OR medication.dosage ILIKE :search)',
          { search: `%${search}%` },
        );
      }
      
      const results = await subQuery.getRawMany();
      medicationIds = results.map((r) => r.id);
      
      if (medicationIds.length === 0) {
        return {
          data: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            totalPages: 0,
          },
        };
      }
    }

    if (userRole === 'Healthcare Staff' && userId && medicationIds) {
      query.andWhere('medication.id IN (:...medicationIds)', { medicationIds });
    } else {
      if (search) {
        query.andWhere(
          '(medication.name ILIKE :search OR medication.dosage ILIKE :search)',
          { search: `%${search}%` },
        );
      }
    }

    let total: number;
    if (userRole === 'Healthcare Staff' && userId && medicationIds) {
      total = medicationIds.length;
      const [data] = await query
        .orderBy('medication.createdAt', 'DESC')
        .skip(skip)
        .take(limitNum)
        .getMany();
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

    const [data, totalCount] = await query
      .orderBy('medication.createdAt', 'DESC')
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();
    
    total = totalCount;

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
    const medication = await this.medicationRepository.findOne({
      where: { id },
      relations: ['programs'],
    });

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    return medication;
  }

  async update(id: string, updateMedicationDto: UpdateMedicationDto, userId: string) {
    const medication = await this.medicationRepository.findOne({
      where: { id },
      relations: ['programs'],
    });

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    if (updateMedicationDto.programIds !== undefined) {
      if (updateMedicationDto.programIds.length > 0) {
        const programs = await this.programRepository.findBy({
          id: In(updateMedicationDto.programIds),
        });
        medication.programs = programs;
      } else {
        medication.programs = [];
      }
      delete updateMedicationDto.programIds;
    }

    Object.assign(medication, updateMedicationDto);
    const savedMedication = await this.medicationRepository.save(medication);

    await this.activityLogsService.create(
      ActivityType.MEDICATION,
      `Updated medication: ${savedMedication.name}`,
      userId,
      { medicationId: savedMedication.id },
    );

    return this.findOne(savedMedication.id);
  }

  async remove(id: string, userId: string) {
    const medication = await this.medicationRepository.findOne({ where: { id } });
    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    await this.medicationRepository.remove(medication);

    await this.activityLogsService.create(
      ActivityType.MEDICATION,
      `Deleted medication: ${medication.name}`,
      userId,
      { medicationId: id },
    );

    return { message: 'Medication deleted successfully' };
  }
}

