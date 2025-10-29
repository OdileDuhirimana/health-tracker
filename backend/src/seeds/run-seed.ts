import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { seedDatabase } from './seed';
import { User } from '../entities/user.entity';
import { Program } from '../entities/program.entity';
import { Medication } from '../entities/medication.entity';
import { Patient } from '../entities/patient.entity';
import { PatientEnrollment } from '../entities/patient-enrollment.entity';
import { Dispensation } from '../entities/dispensation.entity';
import { Attendance } from '../entities/attendance.entity';
import { ActivityLog } from '../entities/activity-log.entity';
import { Notification } from '../entities/notification.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';

async function runSeed() {
  const configService = new ConfigService({
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: parseInt(process.env.DB_PORT || '5432'),
    DB_USERNAME: process.env.DB_USERNAME || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
    DB_DATABASE: process.env.DB_DATABASE || 'healthtrackdb',
  });

  const dataSource = new DataSource({
    type: 'postgres',
    host: configService.get<string>('DB_HOST'),
    port: configService.get<number>('DB_PORT'),
    username: configService.get<string>('DB_USERNAME'),
    password: configService.get<string>('DB_PASSWORD'),
    database: configService.get<string>('DB_DATABASE'),
    entities: [User, Program, Medication, Patient, PatientEnrollment, Dispensation, Attendance, ActivityLog, Notification, Role, Permission],
    synchronize: true, // Enable to auto-create tables if they don't exist
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');
    
    // Check if users already exist - clear if they do
    const userCount = await dataSource.getRepository(User).count();
    if (userCount > 0) {
      console.log('⚠️  Existing data found. Clearing database...');
      // Use raw SQL to truncate all tables with CASCADE to handle foreign keys
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.query('TRUNCATE TABLE notifications, activity_logs, dispensations, attendances, patient_enrollments, patients, programs, medications, users, program_medications, user_programs CASCADE');
      await queryRunner.release();
      console.log('✅ Database cleared');
    }
    
    await seedDatabase(dataSource);
    await dataSource.destroy();
    console.log('✅ Seed completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    await dataSource.destroy().catch(() => {});
    process.exit(1);
  }
}

runSeed();

