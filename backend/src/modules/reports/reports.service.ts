import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Patient } from '../../entities/patient.entity';
import { Program } from '../../entities/program.entity';
import { Medication } from '../../entities/medication.entity';
import { Attendance, AttendanceStatus } from '../../entities/attendance.entity';
import { User, UserRole } from '../../entities/user.entity';
import { PatientEnrollment } from '../../entities/patient-enrollment.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
    @InjectRepository(Program)
    private programRepository: Repository<Program>,
    @InjectRepository(Medication)
    private medicationRepository: Repository<Medication>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(PatientEnrollment)
    private enrollmentRepository: Repository<PatientEnrollment>,
  ) {}

  async generatePatientReport(filters?: { programId?: string; startDate?: string; endDate?: string }, userRole?: string, userId?: string) {
    const query = this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.enrollments', 'enrollments')
      .leftJoinAndSelect('enrollments.program', 'program');

    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      query.andWhere('enrollments.assignedStaffId = :userId', { userId });
    }

    if (filters?.programId) {
      query.andWhere('program.id = :programId', { programId: filters.programId });
    }

    const patients = await query.getMany();

    return patients.map((p) => ({
      id: p.patientId,
      name: p.fullName,
      email: p.email || '',
      program: p.enrollments?.[0]?.program?.name || '',
      enrollmentDate: p.enrollments?.[0]?.enrollmentDate || '',
      status: p.status,
    }));
  }

  async generateProgramReport(filters?: { startDate?: string; endDate?: string }, userRole?: string, userId?: string) {
    const query = this.programRepository
      .createQueryBuilder('program')
      .select([
        'program.id',
        'program.name',
        'program.type',
        'program.status',
        'program.createdAt',
      ]);

    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      query.andWhere(
        'program.id IN (SELECT DISTINCT enrollment.programId FROM patient_enrollments enrollment WHERE enrollment.assignedStaffId = :userId)',
        { userId }
      );
    }

    if (filters?.startDate && filters?.endDate) {
      query.andWhere('program.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    const programs = await query.getMany();

    const programReports = await Promise.all(programs.map(async (p) => {
      let totalPatients = 0;
      if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
        totalPatients = await this.enrollmentRepository.count({
          where: { programId: p.id, assignedStaffId: userId },
        });
      } else {
        totalPatients = await this.enrollmentRepository.count({
          where: { programId: p.id },
        });
      }

      return {
        'Program Name': p.name,
        Type: p.type,
        'Total Patients': totalPatients,
        Status: p.status,
        'Created Date': p.createdAt,
      };
    }));

    return programReports;
  }

  async generateMedicationReport(userRole?: string, userId?: string) {
    let query = this.medicationRepository
      .createQueryBuilder('medication')
      .leftJoinAndSelect('medication.programs', 'programs')
      .select([
        'medication.id',
        'medication.name',
        'medication.dosage',
        'medication.frequency',
        'medication.status',
        'programs.id',
        'programs.name',
      ]);

    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      query.andWhere(
        'programs.id IN (SELECT DISTINCT enrollment.programId FROM patient_enrollments enrollment WHERE enrollment.assignedStaffId = :userId)',
        { userId }
      );
    }

    const medications = await query.orderBy('medication.createdAt', 'DESC').getMany();

    return medications.map((m) => ({
      Medication: m.name,
      Dosage: m.dosage,
      Frequency: m.frequency,
      'Assigned Programs': m.programs?.map((p) => p.name).join(', ') || '',
      Status: m.status,
    }));
  }

  async generateAttendanceReport(filters?: { programId?: string; startDate?: string; endDate?: string }, userRole?: string, userId?: string) {
    const query = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.program', 'program')
      .leftJoinAndSelect('attendance.patient', 'patient')
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

    if (filters?.startDate && filters?.endDate) {
      query.andWhere('attendance.attendanceDate BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    const attendances = await query.getMany();

    const grouped = attendances.reduce((acc, att) => {
      const attendanceDate = new Date(att.attendanceDate).toISOString().split('T')[0];
      const key = `${att.program.name}_${attendanceDate}`;
      if (!acc[key]) {
        acc[key] = {
          'Date': attendanceDate,
          Program: att.program.name,
          Scheduled: 0,
          Attended: 0,
          Missed: 0,
        };
      }
      acc[key].Scheduled++;
      if (att.status === AttendanceStatus.PRESENT || att.status === AttendanceStatus.LATE) {
        acc[key].Attended++;
      } else {
        acc[key].Missed++;
      }
      return acc;
    }, {});

    return Object.values(grouped).map((row: any) => ({
      ...row,
      'Attendance Rate': `${((row.Attended / row.Scheduled) * 100).toFixed(0)}%`,
    }));
  }

  async generateUserReport() {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.assignedPrograms', 'programs')
      .getMany();

    return users.map((u) => ({
      Name: u.name,
      Email: u.email,
      Role: u.role,
      'Assigned Programs': u.assignedPrograms?.map((p) => p.name).join(', ') || '',
      Status: u.status,
      Created: u.createdAt,
    }));
  }
}

