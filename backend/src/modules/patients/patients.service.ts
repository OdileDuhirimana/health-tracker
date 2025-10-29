import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm';
import { Patient, PatientStatus } from '../../entities/patient.entity';
import { PatientEnrollment } from '../../entities/patient-enrollment.entity';
import { Program, SessionFrequency } from '../../entities/program.entity';
import { User, UserRole } from '../../entities/user.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { EnrollPatientDto } from './dto/enroll-patient.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ActivityType } from '../../entities/activity-log.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/notification.entity';
import { Attendance, AttendanceStatus } from '../../entities/attendance.entity';
import { Dispensation } from '../../entities/dispensation.entity';
import { DateUtils } from '../../common/utils/date.utils';
import { QueryUtils } from '../../common/utils/query.utils';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
    @InjectRepository(PatientEnrollment)
    private enrollmentRepository: Repository<PatientEnrollment>,
    @InjectRepository(Program)
    private programRepository: Repository<Program>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Dispensation)
    private dispensationRepository: Repository<Dispensation>,
    @InjectDataSource()
    private dataSource: DataSource,
    private activityLogsService: ActivityLogsService,
    private notificationsService: NotificationsService,
  ) {}

  async generatePatientId(): Promise<string> {
    const lastPatient = await this.patientRepository
      .createQueryBuilder('patient')
      .where("patient.patientId LIKE 'P-%'")
      .orderBy('patient.patientId', 'DESC')
      .getOne();

    if (!lastPatient) {
      return 'P-1001';
    }

    const lastNumber = parseInt(lastPatient.patientId.replace('P-', ''));
    return `P-${lastNumber + 1}`;
  }

  async create(createPatientDto: CreatePatientDto, userId: string) {
    const patientId = await this.generatePatientId();
    const patient = this.patientRepository.create({
      ...createPatientDto,
      patientId,
    });

    const savedPatient = await this.patientRepository.save(patient);

    await this.activityLogsService.create(
      ActivityType.USER,
      `Created patient: ${savedPatient.fullName}`,
      userId,
      { patientId: savedPatient.id },
    );

    return savedPatient;
  }

  async findAll(filters?: { search?: string; programId?: string; status?: string; page?: number; limit?: number; sortBy?: string; sortOrder?: 'ASC' | 'DESC' }, userRole?: string, userId?: string) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 100);
    const skip = (page - 1) * limit;

    let patientIds: string[] | undefined;
    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      const subQuery = this.patientRepository
        .createQueryBuilder('patient')
        .select('DISTINCT patient.id', 'id')
        .innerJoin('patient.enrollments', 'enrollments', 'enrollments.assignedStaffId = :userId', { userId })
        .where('patient.status = :patientStatus', { patientStatus: PatientStatus.ACTIVE });
      
      if (filters?.search) {
        subQuery.andWhere(
          '(patient.fullName ILIKE :search OR patient.patientId ILIKE :search OR patient.email ILIKE :search OR patient.contactNumber ILIKE :search)',
          { search: `%${filters.search}%` },
        );
      }
      
      if (filters?.programId) {
        subQuery.andWhere('enrollments.programId = :programId', { programId: filters.programId });
      }
      
      if (filters?.status) {
        subQuery.andWhere('patient.status = :status', { status: filters.status });
      }
      
      const results = await subQuery.getRawMany();
      patientIds = results.map((r) => r.id);
      
      if (patientIds.length === 0) {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        };
      }
    }

    const query = this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.enrollments', 'enrollments')
      .leftJoinAndSelect('enrollments.program', 'program')
      .leftJoinAndSelect('enrollments.assignedStaff', 'assignedStaff');

    if (userRole === UserRole.HEALTHCARE_STAFF && userId && patientIds) {
      query.andWhere('patient.id IN (:...patientIds)', { patientIds });
    }

    if (userRole !== UserRole.HEALTHCARE_STAFF || !userId) {
      if (filters?.search) {
        query.andWhere(
          '(patient.fullName ILIKE :search OR patient.patientId ILIKE :search OR patient.email ILIKE :search OR patient.contactNumber ILIKE :search)',
          { search: `%${filters.search}%` },
        );
      }

      if (filters?.programId) {
        query.andWhere('program.id = :programId', { programId: filters.programId });
      }

      if (filters?.status) {
        query.andWhere('patient.status = :status', { status: filters.status });
      }
    }

    let total: number;
    let patientData: Patient[];
    
    if (userRole === UserRole.HEALTHCARE_STAFF && userId && patientIds) {
      // For Healthcare Staff: use patientIds length as total and fetch data
      total = patientIds.length;
      patientData = await query
        .orderBy('patient.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getMany();
    } else {
      // For Admin: get data and count together
      const [data, totalCount] = await query
        .orderBy('patient.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();
      patientData = data;
      total = totalCount;
    }

    // Calculate progress and adherence for each patient (only if needed for sorting)
    const needsProgressCalc = filters?.sortBy === 'progress' || filters?.sortBy === 'adherence';
    let patientsWithProgress = patientData;

    if (needsProgressCalc) {
      patientsWithProgress = await Promise.all(
        patientData.map(async (patient) => {
          const progress = await this.calculatePatientProgress(patient.id);
          return { ...patient, progress };
        })
      );
    } else {
      patientsWithProgress = await Promise.all(
        patientData.map(async (patient) => {
          const progress = await this.calculatePatientProgress(patient.id);
          return { ...patient, progress };
        })
      );
    }

    if (filters?.sortBy && (filters.sortBy === 'progress' || filters.sortBy === 'adherence')) {
      patientsWithProgress.sort((a: any, b: any) => {
        const aValue = filters.sortBy === 'progress' ? (a.progress?.attendanceRate || 0) :
                       filters.sortBy === 'adherence' ? (a.progress?.adherenceRate || 0) : 0;
        const bValue = filters.sortBy === 'progress' ? (b.progress?.attendanceRate || 0) :
                       filters.sortBy === 'adherence' ? (b.progress?.adherenceRate || 0) : 0;
        return filters.sortOrder === 'ASC' ? aValue - bValue : bValue - aValue;
      });
    }

    return {
      data: patientsWithProgress,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async calculatePatientProgress(patientId: string): Promise<{
    attendanceRate: number;
    adherenceRate: number;
    sessionsCompleted: number;
    sessionsMissed: number;
    sessionsExpected: number;
    medicationsDispensed: number;
    medicationsExpected: number;
    hasMissedSessions: boolean;
  }> {
    const enrollments = await this.enrollmentRepository.find({
      where: { patientId },
      relations: ['program'],
    });

    if (enrollments.length === 0) {
      return {
        attendanceRate: 0,
        adherenceRate: 0,
        sessionsCompleted: 0,
        sessionsMissed: 0,
        sessionsExpected: 0,
        medicationsDispensed: 0,
        medicationsExpected: 0,
        hasMissedSessions: false,
      };
    }

    const now = new Date();
    let totalSessionsCompleted = 0;
    let totalSessionsMissed = 0;
    let totalSessionsExpected = 0;
    let totalMedicationsDispensed = 0;
    let totalMedicationsExpected = 0;

    for (const enrollment of enrollments) {
      if (enrollment.isCompleted && enrollment.endDate) {
        const endDate = new Date(enrollment.endDate);
        const startDate = new Date(enrollment.enrollmentDate);

        // Calculate expected sessions based on program frequency
        const expectedSessions = this.calculateExpectedSessions(
          enrollment.program.sessionFrequency,
          startDate,
          endDate
        );
        totalSessionsExpected += expectedSessions;
      } else {
        const startDate = new Date(enrollment.enrollmentDate);
        const expectedSessions = this.calculateExpectedSessions(
          enrollment.program.sessionFrequency,
          startDate,
          now
        );
        totalSessionsExpected += expectedSessions;
      }

      // Get actual attendance records
      const attendances = await this.attendanceRepository.find({
        where: {
          patientId,
          programId: enrollment.programId,
        },
      });

      const completed = attendances.filter(
        (a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE
      ).length;
      const missed = attendances.filter(
        (a) => a.status === AttendanceStatus.ABSENT
      ).length;

      totalSessionsCompleted += completed;
      totalSessionsMissed += missed;

      const program = await this.programRepository.findOne({
        where: { id: enrollment.programId },
        relations: ['medications'],
      });

      if (program && program.medications) {
        const enrollmentStart = new Date(enrollment.enrollmentDate);
        const enrollmentEnd = enrollment.isCompleted && enrollment.endDate
          ? new Date(enrollment.endDate)
          : now;

        for (const medication of program.medications) {
          const expected = this.calculateExpectedMedications(
            medication.frequency,
            enrollmentStart,
            enrollmentEnd
          );
          totalMedicationsExpected += expected;
        }
      }
    }

    // Get actual dispensations
    const dispensations = await this.dispensationRepository.find({
      where: { patientId },
    });
    totalMedicationsDispensed = dispensations.length;

    const attendanceRate = totalSessionsExpected > 0
      ? Math.round((totalSessionsCompleted / totalSessionsExpected) * 100)
      : 0;

    const adherenceRate = totalMedicationsExpected > 0
      ? Math.round((totalMedicationsDispensed / totalMedicationsExpected) * 100)
      : 0;

    const hasMissedSessions = totalSessionsExpected > totalSessionsCompleted;

    return {
      attendanceRate,
      adherenceRate,
      sessionsCompleted: totalSessionsCompleted,
      sessionsMissed: totalSessionsMissed,
      sessionsExpected: totalSessionsExpected,
      medicationsDispensed: totalMedicationsDispensed,
      medicationsExpected: totalMedicationsExpected,
      hasMissedSessions,
    };
  }

  private calculateExpectedSessions(frequency: SessionFrequency, startDate: Date, endDate: Date): number {
    return DateUtils.calculateExpectedOccurrences(frequency, startDate, endDate);
  }

  private calculateExpectedMedications(frequency: string, startDate: Date, endDate: Date): number {
    return DateUtils.calculateExpectedOccurrences(frequency, startDate, endDate);
  }

  async findOne(id: string, userRole?: string, userId?: string) {
    const query = this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.enrollments', 'enrollments')
      .leftJoinAndSelect('enrollments.program', 'program')
      .leftJoinAndSelect('enrollments.assignedStaff', 'assignedStaff')
      .where('patient.id = :id', { id });

    // Healthcare Staff can only see assigned patients
    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      query.andWhere('enrollments.assignedStaffId = :userId', { userId });
    }

    const patient = await query.getOne();

    if (!patient) {
      throw new NotFoundException('Patient not found or you do not have access to this patient');
    }

    return patient;
  }

  async update(id: string, updatePatientDto: UpdatePatientDto, userId: string, userRole?: string) {
    const patient = await this.patientRepository.findOne({ 
      where: { id },
      relations: ['enrollments', 'enrollments.assignedStaff'],
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Healthcare Staff can only edit assigned patients
    if (userRole === UserRole.HEALTHCARE_STAFF) {
      const isAssigned = patient.enrollments.some(
        enrollment => enrollment.assignedStaffId === userId
      );
      if (!isAssigned) {
        throw new ForbiddenException('You can only edit patients assigned to you');
      }
    }

    Object.assign(patient, updatePatientDto);
    const savedPatient = await this.patientRepository.save(patient);

    await this.activityLogsService.create(
      ActivityType.USER,
      `Updated patient: ${savedPatient.fullName}`,
      userId,
      { patientId: savedPatient.id },
    );

    return savedPatient;
  }

  async enroll(enrollPatientDto: EnrollPatientDto, userId: string, userRole?: string) {
    // Use transaction to ensure data consistency
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const patient = await queryRunner.manager.findOne(Patient, {
      where: { id: enrollPatientDto.patientId },
    });

    if (!patient) {
        await queryRunner.rollbackTransaction();
      throw new NotFoundException('Patient not found');
    }

      const program = await queryRunner.manager.findOne(Program, {
      where: { id: enrollPatientDto.programId },
      relations: ['assignedStaff'],
    });

    if (!program) {
        await queryRunner.rollbackTransaction();
      throw new NotFoundException('Program not found');
    }

    // Healthcare Staff can only enroll patients in programs they are assigned to
    if (userRole === UserRole.HEALTHCARE_STAFF) {
      const isAssignedToProgram = program.assignedStaff?.some(
        (staff) => staff.id === userId
      );
      if (!isAssignedToProgram) {
        await queryRunner.rollbackTransaction();
        throw new ForbiddenException(
          'You can only enroll patients in programs you are assigned to'
        );
      }
    }

    // Check if already enrolled
      const existingEnrollment = await queryRunner.manager.findOne(PatientEnrollment, {
      where: {
        patientId: enrollPatientDto.patientId,
        programId: enrollPatientDto.programId,
      },
    });

    if (existingEnrollment) {
        await queryRunner.rollbackTransaction();
      throw new BadRequestException('Patient is already enrolled in this program');
    }

    // Only Admin can explicitly assign staff to patients
    // If no staff is assigned, auto-assign from program's assigned staff
    let assignedStaffId = enrollPatientDto.assignedStaffId;
    
    if (userRole !== UserRole.ADMIN && enrollPatientDto.assignedStaffId) {
      // Healthcare Staff cannot assign other staff - clear the explicit assignment
      assignedStaffId = undefined;
    }
    
    // Auto-assign staff from program's assigned staff if not explicitly provided
    if (!assignedStaffId && program.assignedStaff && program.assignedStaff.length > 0) {
      // Assign the first available staff from the program
      assignedStaffId = program.assignedStaff[0].id;
    }

      const enrollment = queryRunner.manager.create(PatientEnrollment, {
      patientId: enrollPatientDto.patientId,
      programId: enrollPatientDto.programId,
      assignedStaffId: assignedStaffId,
      enrollmentDate: enrollPatientDto.enrollmentDate || new Date(),
    });

      const savedEnrollment = await queryRunner.manager.save(enrollment);

      // Commit transaction
      await queryRunner.commitTransaction();

      // Create activity log (non-critical, outside transaction)
      try {
    await this.activityLogsService.create(
      ActivityType.ENROLLMENT,
      `Enrolled ${patient.fullName} in ${program.name}`,
      userId,
      { patientId: patient.id, programId: program.id },
    );
      } catch (error) {
        // Activity log creation failure is non-critical
      }

      // Create enrollment notification (non-critical, outside transaction)
    try {
      await this.notificationsService.create(
        NotificationType.ENROLLMENT,
        'New Patient Enrolled',
        `${patient.fullName} enrolled in ${program.name}`,
        userId,
        `/patients/${patient.id}`,
      );
      
      // Also notify assigned staff if any
        if (assignedStaffId) {
        await this.notificationsService.create(
          NotificationType.ENROLLMENT,
          'New Patient Assignment',
          `You have been assigned to ${patient.fullName} in ${program.name}`,
            assignedStaffId,
          `/patients/${patient.id}`,
        );
      }
    } catch (error) {
      // Notification creation failure is non-critical
    }

    return this.findOne(enrollPatientDto.patientId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getPatientStats(patientId: string) {
    const patient = await this.findOne(patientId);
    const progress = await this.calculatePatientProgress(patientId);
    
    return {
      patient,
      enrollments: patient.enrollments,
      progress,
    };
  }

  async removeFromProgram(patientId: string, programId: string, userId: string) {
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        patientId,
        programId,
      },
      relations: ['patient', 'program'],
    });

    if (!enrollment) {
      throw new NotFoundException('Patient is not enrolled in this program');
    }

    const patient = enrollment.patient;
    const program = enrollment.program;

    await this.enrollmentRepository.remove(enrollment);

    await this.activityLogsService.create(
      ActivityType.ENROLLMENT,
      `Removed ${patient.fullName} from ${program.name}`,
      userId,
      { patientId: patient.id, programId: program.id },
    );

    return { message: 'Patient removed from program successfully' };
  }

  async markProgramCompleted(
    patientId: string,
    programId: string,
    completionNotes: string,
    userId: string,
    userRole?: string,
  ) {
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        patientId,
        programId,
      },
      relations: ['patient', 'program', 'assignedStaff'],
    });

    if (!enrollment) {
      throw new NotFoundException('Patient is not enrolled in this program');
    }

    // Healthcare Staff can only mark programs as completed for assigned patients
    if (userRole === UserRole.HEALTHCARE_STAFF) {
      if (enrollment.assignedStaffId !== userId) {
        throw new ForbiddenException('You can only mark programs as completed for patients assigned to you');
      }
    }

    // Check if already completed
    if (enrollment.isCompleted) {
      throw new BadRequestException('Program is already marked as completed');
    }

    enrollment.isCompleted = true;
    enrollment.endDate = new Date();
    enrollment.completionNotes = completionNotes || null;

    const savedEnrollment = await this.enrollmentRepository.save(enrollment);

    await this.activityLogsService.create(
      ActivityType.ENROLLMENT,
      `Marked ${enrollment.patient.fullName}'s ${enrollment.program.name} program as completed`,
      userId,
      { patientId: patientId, programId: programId, endDate: enrollment.endDate },
    );

    // Create completion notification
    try {
      await this.notificationsService.create(
        NotificationType.ENROLLMENT,
        'Program Completed',
        `${enrollment.patient.fullName} completed ${enrollment.program.name} program`,
        userId,
        `/patients/${patientId}`,
      );
    } catch (error) {
      // Notification creation failure is non-critical
    }

    return savedEnrollment;
  }

  /**
   * Get patients with missed sessions (flagged for attention)
   */
  async getPatientsWithMissedSessions(
    programId?: string,
    userRole?: string,
    userId?: string,
  ) {
    // Get all active enrollments
    const enrollmentsQuery = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.patient', 'patient')
      .leftJoinAndSelect('enrollment.program', 'program')
      .where('patient.status = :status', { status: PatientStatus.ACTIVE })
      .andWhere('enrollment.isCompleted = :completed', { completed: false });

    // Filter by program if specified
    if (programId) {
      enrollmentsQuery.andWhere('enrollment.programId = :programId', { programId });
    }

    // Healthcare Staff should only see assigned patients
    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      enrollmentsQuery.andWhere('enrollment.assignedStaffId = :userId', { userId });
    }

    const enrollments = await enrollmentsQuery.getMany();

    const patientsWithMissedSessions = [];

    for (const enrollment of enrollments) {
      const progress = await this.calculatePatientProgress(enrollment.patientId);

      // Flag patient if they have missed sessions
      if (progress.hasMissedSessions) {
        const patient = enrollment.patient;
        patientsWithMissedSessions.push({
          patientId: patient.id,
          patientName: patient.fullName,
          patientIdCode: patient.patientId,
          programId: enrollment.programId,
          programName: enrollment.program.name,
          enrollmentDate: enrollment.enrollmentDate,
          progress: {
            attendanceRate: progress.attendanceRate,
            sessionsCompleted: progress.sessionsCompleted,
            sessionsMissed: progress.sessionsMissed,
            sessionsExpected: progress.sessionsExpected,
            missedSessionsCount: progress.sessionsMissed,
            hasMissedSessions: progress.hasMissedSessions,
          },
        });
      }
    }

    return {
      data: patientsWithMissedSessions,
      total: patientsWithMissedSessions.length,
    };
  }

  /**
   * Get detailed missed sessions information for a specific patient
   */
  async getPatientMissedSessions(
    patientId: string,
    userRole?: string,
    userId?: string,
  ) {
    const patient = await this.findOne(patientId);

    // Healthcare Staff can only view assigned patients
    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      const isAssigned = patient.enrollments.some(
        (enrollment) => enrollment.assignedStaffId === userId,
      );
      if (!isAssigned) {
        throw new ForbiddenException('You can only view missed sessions for assigned patients');
      }
    }

    const progress = await this.calculatePatientProgress(patientId);

    // Get all enrollments for this patient
    const enrollments = await this.enrollmentRepository.find({
      where: { patientId },
      relations: ['program'],
    });

    const missedSessionsDetails = [];

    for (const enrollment of enrollments) {
      const programProgress = await this.calculatePatientProgress(patientId);
      
      // Get actual attendance records
      const attendances = await this.attendanceRepository.find({
        where: {
          patientId,
          programId: enrollment.programId,
        },
        order: { attendanceDate: 'DESC' },
      });

      // Calculate expected sessions based on program frequency
      const enrollmentDate = new Date(enrollment.enrollmentDate);
      const endDate = enrollment.isCompleted && enrollment.endDate
        ? new Date(enrollment.endDate)
        : new Date();
      
      const expectedSessions = this.calculateExpectedSessions(
        enrollment.program.sessionFrequency,
        enrollmentDate,
        endDate,
      );

      // Find missed sessions (expected but absent)
      const missedSessions = attendances.filter(
        (a) => a.status === AttendanceStatus.ABSENT,
      );

      if (missedSessions.length > 0 || expectedSessions > attendances.length) {
        missedSessionsDetails.push({
          programId: enrollment.programId,
          programName: enrollment.program.name,
          enrollmentDate: enrollment.enrollmentDate,
          expectedSessions,
          actualSessions: attendances.length,
          completedSessions: attendances.filter(
            (a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE,
          ).length,
          missedSessions: missedSessions.map((att) => ({
            date: att.attendanceDate,
            status: att.status,
            notes: att.notes,
          })),
          attendanceRate: expectedSessions > 0
            ? Math.round(
                (attendances.filter(
                  (a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE,
                ).length / expectedSessions) * 100,
              )
            : 0,
        });
      }
    }

    return {
      patientId: patient.id,
      patientName: patient.fullName,
      patientIdCode: patient.patientId,
      overallProgress: progress,
      missedSessionsByProgram: missedSessionsDetails,
      totalMissedSessions: progress.sessionsMissed,
      hasMissedSessions: progress.hasMissedSessions,
    };
  }

  // Materialize progress fields for a given enrollment
  async recomputeProgress(enrollmentId: string) {
    const enrollment = await this.enrollmentRepository.findOne({ where: { id: enrollmentId } });
    if (!enrollment) return;

    const atts = await this.attendanceRepository.find({ where: { patientId: enrollment.patientId, programId: enrollment.programId } });
    const expected = atts.length;
    const completed = atts.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
    const missed = atts.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const attendanceRate = expected ? Math.round(((completed) / expected) * 100) : 0;

    // naive adherence based on last 7 days count
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const dispensed = await this.dispensationRepository.count({ where: { patientId: enrollment.patientId, programId: enrollment.programId, dispensedAt: Between(since, new Date()) } as any });
    const adherenceRate = Math.min(100, Math.round((dispensed / 7) * 100));

    Object.assign(enrollment, {
      sessionsExpected: expected,
      sessionsCompleted: completed,
      sessionsMissed: missed,
      attendanceRate,
      adherenceRate,
    });
    await this.enrollmentRepository.save(enrollment);
  }
}

