import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Attendance, AttendanceStatus } from '../../entities/attendance.entity';
import { Program } from '../../entities/program.entity';
import { PatientEnrollment } from '../../entities/patient-enrollment.entity';
import { UserRole } from '../../entities/user.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ActivityType } from '../../entities/activity-log.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/notification.entity';
import { PatientsService } from '../patients/patients.service';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Program)
    private programRepository: Repository<Program>,
    @InjectRepository(PatientEnrollment)
    private enrollmentRepository: Repository<PatientEnrollment>,
    private activityLogsService: ActivityLogsService,
    private notificationsService: NotificationsService,
    private patientsService: PatientsService,
  ) {}

  async create(createAttendanceDto: CreateAttendanceDto, userId: string) {
    const program = await this.programRepository.findOne({
      where: { id: createAttendanceDto.programId },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    const enrollments = await this.enrollmentRepository.find({ where: { programId: createAttendanceDto.programId } });
    const byPatient = new Map(enrollments.map(e => [e.patientId, e] as const));

    const attendancesPayload: DeepPartial<Attendance>[] = createAttendanceDto.attendances.map((att) => ({
      patientId: att.patientId,
      programId: createAttendanceDto.programId,
      attendanceDate: new Date(createAttendanceDto.attendanceDate),
      status: att.status,
      checkInTime: att.checkInTime ? new Date(att.checkInTime) : new Date(),
      notes: att.notes,
      markedById: userId,
      enrollmentId: byPatient.get(att.patientId)?.id ?? null,
    }));

    const attendances = this.attendanceRepository.create(attendancesPayload);

    const savedAttendances: Attendance[] = await this.attendanceRepository.save(attendances);

    const combos = Array.from(new Set(savedAttendances.map(a => `${a.patientId}:${a.programId}`)));
    await Promise.all(
      combos.map(async (key) => {
        const [patientId, programId] = key.split(':');
        const enrollment = await this.enrollmentRepository.findOne({ where: { patientId, programId } });
        if (enrollment) {
          await this.patientsService.recomputeProgress(enrollment.id);
        }
      })
    );

    await this.activityLogsService.create(
      ActivityType.ATTENDANCE,
      `Marked attendance for ${savedAttendances.length} patients in ${program.name}`,
      userId,
      { programId: program.id, attendanceDate: createAttendanceDto.attendanceDate, count: savedAttendances.length },
    );

    try {
      const presentCount = savedAttendances.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
      const absentCount = savedAttendances.filter(a => a.status === AttendanceStatus.ABSENT).length;
      
      await this.notificationsService.create(
        NotificationType.SESSION,
        'Attendance Marked',
        `Attendance recorded for ${savedAttendances.length} patients in ${program.name} (${presentCount} present, ${absentCount} absent)`,
        userId,
        '/attendance',
      );
    } catch (error) {
      // Notification creation failure is non-critical
    }

    return savedAttendances;
  }

  async findAll(filters?: {
    programId?: string;
    date?: string;
    status?: AttendanceStatus;
    page?: number;
    limit?: number;
    search?: string;
  }, userRole?: string, userId?: string) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 100); // Cap at 100 per page
    const skip = (page - 1) * limit;

    const query = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.patient', 'patient')
      .leftJoinAndSelect('attendance.program', 'program')
      .leftJoinAndSelect('attendance.markedBy', 'markedBy')
      .where('attendance.programId IS NOT NULL')
      .andWhere('attendance.attendanceDate IS NOT NULL');

    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      query
        .innerJoin('patient_enrollments', 'enrollment', 'enrollment.patientId = attendance.patientId AND enrollment.programId = attendance.programId')
        .andWhere('enrollment.assignedStaffId = :userId', { userId });
    }

    if (filters?.programId) {
      query.andWhere('attendance.programId = :programId', { programId: filters.programId });
    }

    if (filters?.date) {
      query.andWhere('DATE(attendance.attendanceDate) = :date', { date: filters.date });
    }

    if (filters?.status) {
      query.andWhere('attendance.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      query.andWhere(
        '(patient.fullName ILIKE :search OR program.name ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    const [data, total] = await query
      .orderBy('attendance.attendanceDate', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

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

  async update(id: string, updateAttendanceDto: UpdateAttendanceDto, userId: string, userRole?: string) {
    const attendance = await this.attendanceRepository.findOne({ 
      where: { id },
      relations: ['patient', 'program'],
    });
    
    if (!attendance) {
      throw new NotFoundException('Attendance not found');
    }

    if (userRole === UserRole.HEALTHCARE_STAFF) {
      const enrollment = await this.enrollmentRepository.findOne({
        where: {
          patientId: attendance.patientId,
          programId: attendance.programId,
          assignedStaffId: userId,
        },
      });

      if (!enrollment) {
        throw new NotFoundException('You can only update attendance for patients assigned to you');
      }
    }

    Object.assign(attendance, {
      ...updateAttendanceDto,
      markedById: userId,
    });

    const saved = await this.attendanceRepository.save(attendance);

    const enrollment = await this.enrollmentRepository.findOne({ where: { patientId: saved.patientId, programId: saved.programId } });
    if (enrollment) {
      await this.patientsService.recomputeProgress(enrollment.id);
    }

    return saved;
  }

  async bulkUpdate(
    programId: string,
    attendanceDate: string,
    updates: Array<{ id: string; status: AttendanceStatus }>,
    userId: string,
  ) {
    const attendances = await this.attendanceRepository.find({
      where: { programId, attendanceDate: new Date(attendanceDate) },
    });

    for (const update of updates) {
      const attendance = attendances.find((a) => a.id === update.id);
      if (attendance) {
        attendance.status = update.status;
        attendance.markedById = userId;
      }
    }

    return this.attendanceRepository.save(attendances);
  }

  async getStatistics(programId?: string, startDate?: string, endDate?: string, userRole?: string, userId?: string) {
    const query = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.program', 'program')
      .where('attendance.programId IS NOT NULL')
      .andWhere('attendance.attendanceDate IS NOT NULL');

    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      query
        .innerJoin('patient_enrollments', 'enrollment', 'enrollment.patientId = attendance.patientId AND enrollment.programId = attendance.programId')
        .andWhere('enrollment.assignedStaffId = :userId', { userId });
    }

    if (programId) {
      query.andWhere('attendance.programId = :programId', { programId });
    }

    if (startDate && endDate) {
      query.andWhere('attendance.attendanceDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const attendances = await query.getMany();
    const total = attendances.length;
    const present = attendances.filter((a) => a.status === AttendanceStatus.PRESENT).length;
    const absent = attendances.filter((a) => a.status === AttendanceStatus.ABSENT).length;
    const late = attendances.filter((a) => a.status === AttendanceStatus.LATE).length;
    const excused = attendances.filter((a) => a.status === AttendanceStatus.EXCUSED).length;

    return {
      total,
      present,
      absent,
      late,
      excused,
      attendanceRate: total > 0 ? ((present + late) / total) * 100 : 0,
    };
  }

  async remove(id: string, userId: string) {
    const attendance = await this.attendanceRepository.findOne({ 
      where: { id },
      relations: ['program', 'patient'],
    });
    
    if (!attendance) {
      throw new NotFoundException('Attendance not found');
    }

    await this.attendanceRepository.remove(attendance);

    await this.activityLogsService.create(
      ActivityType.ATTENDANCE,
      `Deleted attendance record for ${attendance.patient?.fullName || 'patient'} in ${attendance.program?.name || 'program'}`,
      userId,
      { attendanceId: id, programId: attendance.programId },
    );

    return { message: 'Attendance record deleted successfully' };
  }
}

