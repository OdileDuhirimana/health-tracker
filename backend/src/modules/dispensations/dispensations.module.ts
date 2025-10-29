import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DispensationsController } from './dispensations.controller';
import { DispensationsService } from './dispensations.service';
import { Dispensation } from '../../entities/dispensation.entity';
import { Patient, PatientStatus } from '../../entities/patient.entity';
import { Medication, MedicationStatus } from '../../entities/medication.entity';
import { Program } from '../../entities/program.entity';
import { PatientEnrollment } from '../../entities/patient-enrollment.entity';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dispensation, Patient, Medication, Program, PatientEnrollment]),
    ActivityLogsModule,
    NotificationsModule,
  ],
  controllers: [DispensationsController],
  providers: [DispensationsService],
  exports: [DispensationsService],
})
export class DispensationsModule {}

