import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Dispensation } from '../../entities/dispensation.entity';
import { Medication, MedicationFrequency, MedicationStatus } from '../../entities/medication.entity';
import { Patient, PatientStatus } from '../../entities/patient.entity';
import { PatientEnrollment } from '../../entities/patient-enrollment.entity';
import { Program, ProgramStatus } from '../../entities/program.entity';
import { UserRole } from '../../entities/user.entity';
import { CreateDispensationDto } from './dto/create-dispensation.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ActivityType } from '../../entities/activity-log.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/notification.entity';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, isToday } from 'date-fns';
import { DateUtils } from '../../common/utils/date.utils';

@Injectable()
export class DispensationsService {
  constructor(
    @InjectRepository(Dispensation)
    private dispensationRepository: Repository<Dispensation>,
    @InjectRepository(Medication)
    private medicationRepository: Repository<Medication>,
    @InjectRepository(PatientEnrollment)
    private enrollmentRepository: Repository<PatientEnrollment>,
    private activityLogsService: ActivityLogsService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createDispensationDto: CreateDispensationDto, userId: string) {
    const medication = await this.medicationRepository.findOne({
      where: { id: createDispensationDto.medicationId },
    });

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    await this.checkDuplicateDispensation(
      createDispensationDto.patientId,
      createDispensationDto.medicationId,
      medication.frequency,
      new Date(createDispensationDto.dispensedAt),
    );

    const dispensedAt = new Date(createDispensationDto.dispensedAt);
    let bucketType: 'DAY' | 'MONTH' = 'DAY';
    let bucketStart = startOfDay(dispensedAt);
    if (medication.frequency === MedicationFrequency.MONTHLY) {
      bucketType = 'MONTH';
      bucketStart = startOfMonth(dispensedAt);
    }

    const dispensation = this.dispensationRepository.create({
      ...createDispensationDto,
      dispensedAt,
      dispensedById: userId,
      bucketType,
      bucketStart,
    });

    let savedDispensation;
    try {
      savedDispensation = await this.dispensationRepository.save(dispensation);
    } catch (e: any) {
      if (e && (e.code === '23505' || (e.message || '').includes('uq_dispensation_bucket'))) {
        throw new BadRequestException('Duplicate dispensation prevented by schedule window. This medication has already been dispensed in the current period.');
      }
      throw e;
    }

    const savedDispensationFull = await this.findOne(savedDispensation.id);

    await this.activityLogsService.create(
      ActivityType.MEDICATION,
      `Dispensed ${medication.name} ${medication.dosage} to patient`,
      userId,
      { 
        dispensationId: savedDispensation.id,
        patientId: createDispensationDto.patientId,
        medicationId: medication.id,
      },
    );

    try {
      if (savedDispensationFull.patient && savedDispensationFull.program) {
        await this.notificationsService.create(
          NotificationType.MEDICATION,
          'Medication Dispensed',
          `${medication.name} ${medication.dosage} dispensed to ${savedDispensationFull.patient.fullName || 'patient'} in ${savedDispensationFull.program.name}`,
          userId,
          '/medications',
        );
      }
    } catch (error) {
      // Notification creation failure is non-critical
    }

    return savedDispensationFull;
  }

  async checkDuplicateDispensation(
    patientId: string,
    medicationId: string,
    frequency: MedicationFrequency,
    dispensedAt: Date,
  ) {
    if (frequency === MedicationFrequency.TWICE_DAILY) {
      const { startDate, endDate } = DateUtils.getDateRange('DAILY', dispensedAt);
      
      const todayDispensations = await this.dispensationRepository.count({
        where: {
          patientId,
          medicationId,
          dispensedAt: Between(startDate, endDate),
        },
      });
      
      if (todayDispensations >= 2) {
        throw new BadRequestException(
          'Duplicate dispensation prevented. This medication can only be dispensed twice per day (morning and evening doses).',
        );
      }
      
      return;
    }

    const { startDate, endDate } = DateUtils.getDateRange(frequency, dispensedAt);

    const existing = await this.dispensationRepository.findOne({
      where: {
        patientId,
        medicationId,
        dispensedAt: Between(startDate, endDate),
      },
    });

    if (existing) {
      const hoursAgo = Math.floor(
        (new Date().getTime() - existing.dispensedAt.getTime()) / (1000 * 60 * 60),
      );
      throw new BadRequestException(
        `Duplicate dispensation prevented. This medication was already dispensed ${hoursAgo} hours ago.`,
      );
    }
  }

  async findAll(filters?: {
    patientId?: string;
    programId?: string;
    medicationId?: string;
    startDate?: string;
    endDate?: string;
  }, userRole?: string, userId?: string) {
    const query = this.dispensationRepository
      .createQueryBuilder('dispensation')
      .leftJoinAndSelect('dispensation.patient', 'patient')
      .leftJoinAndSelect('dispensation.medication', 'medication')
      .leftJoinAndSelect('dispensation.program', 'program')
      .leftJoinAndSelect('dispensation.dispensedBy', 'dispensedBy');

    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      query
        .innerJoin('patient_enrollments', 'enrollment', 'enrollment.patientId = dispensation.patientId AND enrollment.programId = dispensation.programId')
        .andWhere('enrollment.assignedStaffId = :userId', { userId });
    }

    if (filters?.patientId) {
      query.andWhere('dispensation.patientId = :patientId', { patientId: filters.patientId });
    }

    if (filters?.programId) {
      query.andWhere('dispensation.programId = :programId', { programId: filters.programId });
    }

    if (filters?.medicationId) {
      query.andWhere('dispensation.medicationId = :medicationId', {
        medicationId: filters.medicationId,
      });
    }

    if (filters?.startDate && filters?.endDate) {
      query.andWhere('dispensation.dispensedAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    return query.orderBy('dispensation.dispensedAt', 'DESC').getMany();
  }

  async findOne(id: string) {
    const dispensation = await this.dispensationRepository.findOne({
      where: { id },
      relations: ['patient', 'medication', 'program', 'dispensedBy'],
    });

    if (!dispensation) {
      throw new NotFoundException('Dispensation not found');
    }

    return dispensation;
  }

  async getPatientHistory(patientId: string, userRole?: string, userId?: string) {
    const query = this.dispensationRepository
      .createQueryBuilder('dispensation')
      .leftJoinAndSelect('dispensation.medication', 'medication')
      .leftJoinAndSelect('dispensation.program', 'program')
      .leftJoinAndSelect('dispensation.dispensedBy', 'dispensedBy')
      .where('dispensation.patientId = :patientId', { patientId });

    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      query
        .innerJoin('patient_enrollments', 'enrollment', 'enrollment.patientId = dispensation.patientId AND enrollment.programId = dispensation.programId')
        .andWhere('enrollment.assignedStaffId = :userId', { userId });
    }

    return query.orderBy('dispensation.dispensedAt', 'DESC').getMany();
  }

  async getPendingDispensations() {
    const now = new Date();
    const query = this.dispensationRepository
      .createQueryBuilder('dispensation')
      .leftJoinAndSelect('dispensation.patient', 'patient')
      .leftJoinAndSelect('dispensation.medication', 'medication')
      .leftJoinAndSelect('dispensation.program', 'program')
      .where('patient.status = :status', { status: PatientStatus.ACTIVE })
      .andWhere('medication.status = :medStatus', { medStatus: MedicationStatus.ACTIVE })
      .orderBy('dispensation.dispensedAt', 'DESC');

    const recentDispensations = await query.getMany();

    return recentDispensations;
  }

  async getMedicationTrackingTable(userRole?: string, userId?: string, page: number = 1, limit: number = 100, search?: string) {
    const enrollmentQuery = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.patient', 'patient')
      .leftJoinAndSelect('enrollment.program', 'program')
      .leftJoinAndSelect('program.medications', 'medications')
      .where('patient.status = :status', { status: PatientStatus.ACTIVE })
      .andWhere('program.status = :programStatus', { programStatus: ProgramStatus.ACTIVE });

    // Healthcare Staff should only see tracking for assigned patients
    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      enrollmentQuery.andWhere('enrollment.assignedStaffId = :userId', { userId });
    }

    const enrollments = await enrollmentQuery.getMany();

    const dispensationQuery = this.dispensationRepository
      .createQueryBuilder('dispensation')
      .leftJoinAndSelect('dispensation.patient', 'patient')
      .leftJoinAndSelect('dispensation.medication', 'medication')
      .leftJoinAndSelect('dispensation.program', 'program')
      .where('patient.status = :status', { status: PatientStatus.ACTIVE })
      .andWhere('medication.status = :medStatus', { medStatus: MedicationStatus.ACTIVE });

    // Healthcare Staff should only see tracking for assigned patients
    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      dispensationQuery
        .innerJoin('patient_enrollments', 'enrollment', 'enrollment.patientId = dispensation.patientId AND enrollment.programId = dispensation.programId')
        .andWhere('enrollment.assignedStaffId = :userId', { userId });
    }

    const allDispensations = await dispensationQuery
      .orderBy('dispensation.dispensedAt', 'DESC')
      .limit(1000)
      .getMany();

    // Get attendance records for adherence calculation
    const attendanceRepository = this.dispensationRepository.manager.getRepository('attendances');
    const attendanceQuery = attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.status IN (:...statuses)', { statuses: ['Present', 'Late'] });

    // Healthcare Staff should only see attendance for assigned patients
    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      attendanceQuery
        .innerJoin('patient_enrollments', 'enrollment', 'enrollment.patientId = attendance.patientId AND enrollment.programId = attendance.programId')
        .andWhere('enrollment.assignedStaffId = :userId', { userId });
    }

    const allAttendance = await attendanceQuery.getMany();

    // Create attendance count map: key = patientId_programId, value = count
    const attendanceCountMap = new Map<string, number>();
    allAttendance.forEach((att: any) => {
      const key = `${att.patientId}_${att.programId}`;
      attendanceCountMap.set(key, (attendanceCountMap.get(key) || 0) + 1);
    });

    // Create a map of patient-program-medication combinations from enrollments and medications
    const trackingMap = new Map<string, {
      patientId: string;
      patientName: string;
      medicationId: string;
      medicationName: string;
      dosage: string;
      frequency: MedicationFrequency;
      programId: string;
      programName: string;
      lastCollected: Date | null;
      dispensationCount: number;
      enrollmentStartDate: Date;
      sessionFrequency: string;
    }>();

    // Initialize tracking map with all enrolled patients and their program medications
    enrollments.forEach(enrollment => {
      const patientId = enrollment.patientId;
      const programId = enrollment.programId;
      const patientName = enrollment.patient?.fullName || 'Unknown';
      const programName = enrollment.program?.name || 'Unknown';
      const enrollmentStartDate = enrollment.enrollmentDate || enrollment.createdAt || now;
      const sessionFrequency = enrollment.program?.sessionFrequency || 'weekly';
      
      // Get medications assigned to this program (already loaded with enrollment)
      const programMedications = (enrollment.program?.medications || []).filter(
        (med: Medication) => med.status === MedicationStatus.ACTIVE
      );
      
      programMedications.forEach((medication: Medication) => {
        const key = `${patientId}_${medication.id}_${programId}`;
        trackingMap.set(key, {
          patientId,
          patientName,
          medicationId: medication.id,
          medicationName: medication.name || 'Unknown',
          dosage: medication.dosage || '—',
          frequency: medication.frequency || MedicationFrequency.DAILY,
          programId,
          programName,
          lastCollected: null,
          dispensationCount: 0,
          enrollmentStartDate,
          sessionFrequency,
        });
      });
    });

    // Process dispensations to update lastCollected and count
    allDispensations.forEach(disp => {
      const key = `${disp.patientId}_${disp.medicationId}_${disp.programId}`;
      const entry = trackingMap.get(key);
      if (entry) {
        entry.dispensationCount++;
        if (!entry.lastCollected || disp.dispensedAt > entry.lastCollected) {
          entry.lastCollected = disp.dispensedAt;
        }
      }
    });

    // Calculate next due and adherence for each entry - return only essential data
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    
    let trackingData = Array.from(trackingMap.values())
      .map(entry => {
        const lastCollectedDate = entry.lastCollected || entry.enrollmentStartDate;
        const nextDue = DateUtils.calculateNextDueDate(lastCollectedDate, entry.frequency);

        const enrollmentStart = new Date(entry.enrollmentStartDate);
        const expectedDispensations = DateUtils.calculateExpectedOccurrences(
          entry.frequency,
          enrollmentStart,
          now,
        );
        
        const sessionFreq = entry.sessionFrequency?.toLowerCase() || 'weekly';
        const expectedAttendance = DateUtils.calculateExpectedOccurrences(
          sessionFreq,
          enrollmentStart,
          now,
        );
        const actualDispensations = entry.dispensationCount;
        
        // Count actual attendance from the attendance count map
        const attendanceKey = `${entry.patientId}_${entry.programId}`;
        const actualAttendance = attendanceCountMap.get(attendanceKey) || 0;
        
        // Calculate total expected and actual
        const totalExpected = expectedDispensations + expectedAttendance;
        const totalActual = actualDispensations + actualAttendance;
        
        // Calculate adherence rate
        const adherenceRate = totalExpected > 0
          ? Math.round((totalActual / totalExpected) * 100)
          : 0;

        // Return only essential fields to minimize response size
        return {
          pId: entry.patientId, // Shortened keys
          pName: entry.patientName,
          mId: entry.medicationId,
          mName: entry.medicationName,
          d: entry.dosage,
          f: entry.frequency,
          prId: entry.programId,
          prName: entry.programName,
          lc: entry.lastCollected ? new Date(entry.lastCollected).toISOString() : null,
          nd: nextDue.toISOString(),
          ar: Math.min(100, Math.max(0, adherenceRate)),
          nextDueDate: nextDue, // Keep for filtering
        };
      })
      // Filter to show only medications due today or overdue (in the past)
      .filter(record => {
        const nextDueDate = new Date(record.nd);
        return nextDueDate <= endOfToday; // Only show if due today or already overdue
      })
      .map(({ nextDueDate, ...rest }) => rest); // Remove temporary field

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      trackingData = trackingData.filter(record => 
        (record.pName || "").toLowerCase().includes(searchLower) ||
        (record.mName || "").toLowerCase().includes(searchLower) ||
        (record.prName || "").toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const total = trackingData.length;
    const skip = (page - 1) * limit;
    const paginatedData = trackingData.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);

    return {
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getOverdueCount(userRole?: string, userId?: string) {
    // Optimized: Use SQL aggregation to find latest dispensations per patient-medication without loading all records
    const now = new Date();
    
    // Get latest dispensation per patient-medication combination using window function approach
    // This is more efficient than loading all records into memory
    const query = this.dispensationRepository
      .createQueryBuilder('dispensation')
      .select('dispensation.patientId', 'patientId')
      .addSelect('dispensation.medicationId', 'medicationId')
      .addSelect('MAX(dispensation.dispensedAt)', 'lastDispensedAt')
      .leftJoin('dispensation.medication', 'medication')
      .leftJoin('dispensation.patient', 'patient')
      .where('patient.status = :status', { status: PatientStatus.ACTIVE })
      .andWhere('medication.status = :medStatus', { medStatus: MedicationStatus.ACTIVE });

    // Healthcare Staff should only see overdue medications for assigned patients
    if (userRole === 'Healthcare Staff' && userId) {
      query
        .innerJoin('patient_enrollments', 'enrollment', 'enrollment.patientId = dispensation.patientId AND enrollment.programId = dispensation.programId')
        .andWhere('enrollment.assignedStaffId = :userId', { userId });
    }

    const latestDispensations = await query
      .groupBy('dispensation.patientId')
      .addGroupBy('dispensation.medicationId')
      .getRawMany();

    // Get medication frequencies in a single query to avoid N+1
    const medicationIds = [...new Set(latestDispensations.map(d => d.dispensation_medicationId))];
    const medications = await this.medicationRepository.find({
      where: { id: In(medicationIds || []) },
      select: ['id', 'frequency'],
    });
    const medicationMap = new Map(medications.map(m => [m.id, m.frequency]));

    // Calculate overdue count efficiently
    let overdueCount = 0;
    const overdueNotifications: Array<Promise<any>> = [];

    latestDispensations.forEach((disp) => {
      const lastDispensed = new Date(disp.lastDispensedAt);
      const frequency = medicationMap.get(disp.dispensation_medicationId) || MedicationFrequency.DAILY;
      const nextDue = DateUtils.calculateNextDueDate(lastDispensed, frequency);

      if (nextDue < now) {
        overdueCount++;
        // Note: We can't create detailed notifications here without loading full records
        // If needed, this could be done in a separate background job
      }
    });
    
    // Fire and forget notification creation if needed (would require more data)
    if (overdueNotifications.length > 0) {
      Promise.all(overdueNotifications).catch(() => {
        // Silently handle errors
      });
    }

    return { count: overdueCount };
  }

  async getOverdueDetails(userRole?: string, userId?: string) {
    // Get all overdue medication records with details - fetch all without pagination
    const trackingResponse = await this.getMedicationTrackingTable(userRole, userId, 1, 10000);
    const trackingData = trackingResponse.data || [];
    const now = new Date();
    
    const overdueRecords = trackingData.filter((record: any) => {
      const nextDue = record.nd ? new Date(record.nd) : record.nextDue ? new Date(record.nextDue) : null;
      return nextDue && nextDue < now && !isToday(nextDue);
    });

    // Map back to full field names
    return overdueRecords.map((record: any) => ({
      patientId: record.pId || record.patientId,
      patientName: record.pName || record.patientName,
      medicationId: record.mId || record.medicationId,
      medicationName: record.mName || record.medicationName,
      dosage: record.d || record.dosage,
      frequency: record.f || record.frequency,
      programId: record.prId || record.programId,
      programName: record.prName || record.programName,
      lastCollected: record.lc || record.lastCollected,
      nextDue: record.nd || record.nextDue,
      adherenceRate: record.ar || record.adherenceRate,
    }));
  }
}

