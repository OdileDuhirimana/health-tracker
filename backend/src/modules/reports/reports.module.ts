import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Patient } from '../../entities/patient.entity';
import { Program } from '../../entities/program.entity';
import { Medication } from '../../entities/medication.entity';
import { Attendance } from '../../entities/attendance.entity';
import { User } from '../../entities/user.entity';
import { PatientEnrollment } from '../../entities/patient-enrollment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Patient,
      Program,
      Medication,
      Attendance,
      User,
      PatientEnrollment,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}

