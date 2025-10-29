import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Program, ProgramStatus } from '../../entities/program.entity';
import { Patient, PatientStatus } from '../../entities/patient.entity';
import { Dispensation } from '../../entities/dispensation.entity';
import { Attendance, AttendanceStatus } from '../../entities/attendance.entity';
import { PatientEnrollment } from '../../entities/patient-enrollment.entity';
import { UserRole } from '../../entities/user.entity';
import { MedicationFrequency, MedicationStatus } from '../../entities/medication.entity';
import { DateUtils } from '../../common/utils/date.utils';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Program)
    private programRepository: Repository<Program>,
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
    @InjectRepository(Dispensation)
    private dispensationRepository: Repository<Dispensation>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(PatientEnrollment)
    private enrollmentRepository: Repository<PatientEnrollment>,
  ) {}

  async getMetrics(userRole?: string, userId?: string) {
    let activePatientsQuery = this.patientRepository
      .createQueryBuilder('patient')
      .where('patient.status = :status', { status: PatientStatus.ACTIVE });

    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      activePatientsQuery
        .innerJoin('patient.enrollments', 'enrollment')
        .andWhere('enrollment.assignedStaffId = :userId', { userId });
    }

    const [
      totalPrograms,
      activePatients,
      pendingMedications,
    ] = await Promise.all([
      this.programRepository.count({ where: { status: ProgramStatus.ACTIVE } }),
      activePatientsQuery.getCount(),
      this.getPendingMedicationsCount(userRole, userId),
    ]);

    return {
      totalPrograms,
      activePatients,
      pendingMedications,
      overdueSessions: 0, // Removed session tracking
    };
  }

  async getPendingMedicationsCount(userRole?: string, userId?: string) {
    return 0;
  }

  async getProgramsOverview(userRole?: string, userId?: string) {
    const query = this.programRepository
      .createQueryBuilder('program')
      .select([
        'program.id',
        'program.name',
        'program.type',
        'program.status',
      ])
      .where('program.status = :status', { status: ProgramStatus.ACTIVE });

    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      query.andWhere(
        'program.id IN (SELECT DISTINCT enrollment.programId FROM patient_enrollments enrollment WHERE enrollment.assignedStaffId = :userId)',
        { userId }
      );
    }

    const subQuery = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select('COUNT(enrollment.id)', 'count')
      .where('enrollment.programId = program.id');
    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      subQuery.andWhere('enrollment.assignedStaffId = :userId', { userId });
    }

    const programs = await query
      .addSelect(`(${subQuery.getQuery()})`, 'totalPatients')
      .setParameters(subQuery.getParameters())
      .orderBy('program.createdAt', 'DESC')
      .getRawMany();

    return programs.map((p) => ({
      name: p.program_name || p.name,
      patients: parseInt(p.totalPatients || '0', 10),
    }));
  }

  async getAttendanceData(userRole?: string, userId?: string) {
    const presentQuery = this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.programId IS NOT NULL')
      .andWhere('attendance.attendanceDate IS NOT NULL')
      .andWhere('attendance.status = :status', { status: AttendanceStatus.PRESENT });

    const absentQuery = this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.programId IS NOT NULL')
      .andWhere('attendance.attendanceDate IS NOT NULL')
      .andWhere('attendance.status = :status', { status: AttendanceStatus.ABSENT });

    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      presentQuery
        .innerJoin('patient_enrollments', 'enrollment', 'enrollment.patientId = attendance.patientId AND enrollment.programId = attendance.programId')
        .andWhere('enrollment.assignedStaffId = :userId', { userId });
      
      absentQuery
        .innerJoin('patient_enrollments', 'enrollment', 'enrollment.patientId = attendance.patientId AND enrollment.programId = attendance.programId')
        .andWhere('enrollment.assignedStaffId = :userId', { userId });
    }

    const [presentCount, absentCount] = await Promise.all([
      presentQuery.getCount(),
      absentQuery.getCount(),
    ]);

    return {
      present: presentCount,
      pending: 0,
      absent: absentCount,
    };
  }

  async getAdherenceRate(userRole?: string, userId?: string) {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const query = this.dispensationRepository
      .createQueryBuilder('dispensation')
      .select('DATE(dispensation.dispensedAt)', 'date')
      .addSelect('COUNT(dispensation.id)', 'count')
      .where('dispensation.dispensedAt >= :sevenDaysAgo', { sevenDaysAgo })
      .andWhere('dispensation.dispensedAt <= :now', { now });

    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      query
        .innerJoin('patient_enrollments', 'enrollment', 'enrollment.patientId = dispensation.patientId AND enrollment.programId = dispensation.programId')
        .andWhere('enrollment.assignedStaffId = :userId', { userId });
    }

    const dispensations = await query
      .groupBy('DATE(dispensation.dispensedAt)')
      .orderBy('DATE(dispensation.dispensedAt)', 'ASC')
      .getRawMany();

    const dateMap = new Map<string, number>();
    dispensations.forEach((d) => {
      dateMap.set(d.date, parseInt(d.count, 10));
    });

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = days.map((day, index) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - index));
      const dateStr = date.toISOString().split('T')[0];
      const count = dateMap.get(dateStr) || 0;
      return { name: day, rate: Math.min(100, Math.max(0, (count / 10) * 100)) };
    });

    return { data };
  }

  async getProgramDurationSummary(userRole?: string, userId?: string) {
    const query = this.programRepository
      .createQueryBuilder('program')
      .leftJoinAndSelect('program.enrollments', 'enrollment')
      .where('program.status = :status', { status: ProgramStatus.ACTIVE });

    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      query.andWhere('enrollment.assignedStaffId = :userId', { userId });
    }

    const programs = await query.getMany();

    const summary = await Promise.all(
      programs.map(async (program) => {
        const enrollments = program.enrollments || [];
        const activeEnrollments = enrollments.filter(e => !e.isCompleted);

        let startDate: Date | null = null;
        let endDate: Date | null = null;

        if (enrollments.length > 0) {
          const dates = enrollments.map(e => new Date(e.enrollmentDate));
          startDate = new Date(Math.min(...dates.map(d => d.getTime())));

          const endDates = enrollments
            .filter(e => e.completedDate)
            .map(e => new Date(e.completedDate));
          if (endDates.length > 0) {
            endDate = new Date(Math.max(...endDates.map(d => d.getTime())));
          }
        }

        const dispensationsQuery = this.dispensationRepository
          .createQueryBuilder('dispensation')
          .where('dispensation.programId = :programId', { programId: program.id });

        if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
          dispensationsQuery
            .innerJoin('patient_enrollments', 'enrollment', 'enrollment.patientId = dispensation.patientId AND enrollment.programId = dispensation.programId')
            .andWhere('enrollment.assignedStaffId = :userId', { userId });
        }

        const dispensationsCount = await dispensationsQuery.getCount();
        const expectedCount = activeEnrollments.length * 30;
        const adherencePercent = expectedCount > 0 ? Math.round((dispensationsCount / expectedCount) * 100) : 0;

        return {
          programName: program.name,
          startDate: startDate ? startDate.toISOString().split('T')[0] : null,
          endDate: endDate ? endDate.toISOString().split('T')[0] : null,
          expectedEnrollments: enrollments.length,
          activePatients: activeEnrollments.length,
          adherencePercent: Math.min(100, adherencePercent),
        };
      })
    );

    return summary.filter(s => s.activePatients > 0);
  }

  async getUpcomingDispensations(userRole?: string, userId?: string) {
    const query = this.dispensationRepository
      .createQueryBuilder('dispensation')
      .leftJoinAndSelect('dispensation.medication', 'medication')
      .leftJoinAndSelect('dispensation.patient', 'patient')
      .leftJoinAndSelect('dispensation.program', 'program')
      .where('patient.status = :status', { status: PatientStatus.ACTIVE })
      .andWhere('medication.status = :medStatus', { medStatus: MedicationStatus.ACTIVE })
      .orderBy('dispensation.dispensedAt', 'DESC');

    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      query
        .innerJoin('patient_enrollments', 'enrollment', 'enrollment.patientId = dispensation.patientId AND enrollment.programId = dispensation.programId')
        .andWhere('enrollment.assignedStaffId = :userId', { userId });
    }

    const allDispensations = await query.getMany();

    const latestDispensations = new Map<string, typeof allDispensations[0]>();
    allDispensations.forEach((disp) => {
      const key = `${disp.patientId}_${disp.medicationId}_${disp.programId}`;
      if (!latestDispensations.has(key)) {
        latestDispensations.set(key, disp);
      }
    });

    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const upcoming: Array<{
      patientId: string;
      patientName: string;
      programId: string;
      programName: string;
      medicationId: string;
      medicationName: string;
      nextDueDate: string;
      status: 'due_today' | 'overdue';
    }> = [];

    latestDispensations.forEach((disp) => {
      const lastDispensed = disp.dispensedAt;
      const frequency = disp.medication?.frequency || MedicationFrequency.DAILY;
      const nextDue = DateUtils.calculateNextDueDate(lastDispensed, frequency);

      if (nextDue <= endOfToday) {
        const status = nextDue < now ? 'overdue' : 'due_today';
        upcoming.push({
          patientId: disp.patientId,
          patientName: disp.patient?.fullName || 'Unknown',
          programId: disp.programId,
          programName: disp.program?.name || 'Unknown',
          medicationId: disp.medicationId,
          medicationName: disp.medication?.name || 'Unknown',
          nextDueDate: nextDue.toISOString(),
          status,
        });
      }
    });

    upcoming.sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
      if (a.status !== 'overdue' && b.status === 'overdue') return 1;
      return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();
    });

    return upcoming;
  }
}

