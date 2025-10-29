import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { Patient } from '../../entities/patient.entity';
import { PatientEnrollment } from '../../entities/patient-enrollment.entity';
import { Program } from '../../entities/program.entity';
import { User } from '../../entities/user.entity';
import { Attendance } from '../../entities/attendance.entity';
import { Dispensation } from '../../entities/dispensation.entity';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient, PatientEnrollment, Program, User, Attendance, Dispensation]),
    ActivityLogsModule,
    NotificationsModule,
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}

