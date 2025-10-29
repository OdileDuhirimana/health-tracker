import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { Attendance } from '../../entities/attendance.entity';
import { Program } from '../../entities/program.entity';
import { Patient } from '../../entities/patient.entity';
import { PatientEnrollment } from '../../entities/patient-enrollment.entity';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance, Program, Patient, PatientEnrollment]),
    ActivityLogsModule,
    NotificationsModule,
    PatientsModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}

