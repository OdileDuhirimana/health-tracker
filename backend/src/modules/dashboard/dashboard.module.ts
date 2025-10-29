import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Program } from '../../entities/program.entity';
import { Patient } from '../../entities/patient.entity';
import { Dispensation } from '../../entities/dispensation.entity';
import { Attendance } from '../../entities/attendance.entity';
import { PatientEnrollment } from '../../entities/patient-enrollment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Program,
      Patient,
      Dispensation,
      Attendance,
      PatientEnrollment,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

