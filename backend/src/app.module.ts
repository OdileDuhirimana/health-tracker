import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmConfigService } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { PatientsModule } from './modules/patients/patients.module';
import { MedicationsModule } from './modules/medications/medications.module';
import { DispensationsModule } from './modules/dispensations/dispensations.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    ProgramsModule,
    PatientsModule,
    MedicationsModule,
    DispensationsModule,
    AttendanceModule,
    ActivityLogsModule,
    DashboardModule,
    ReportsModule,
    NotificationsModule,
  ],
})
export class AppModule {}

