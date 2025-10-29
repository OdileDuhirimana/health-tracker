import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { seedSimpleDatabase } from './src/seeds/simple-seed';
import { User } from './src/entities/user.entity';
import { Role } from './src/entities/role.entity';
import { Permission } from './src/entities/permission.entity';
import { Program } from './src/entities/program.entity';
import { Medication } from './src/entities/medication.entity';
import { Patient } from './src/entities/patient.entity';
import { PatientEnrollment } from './src/entities/patient-enrollment.entity';
import { Dispensation } from './src/entities/dispensation.entity';
import { Attendance } from './src/entities/attendance.entity';
import { ActivityLog } from './src/entities/activity-log.entity';
import { Notification } from './src/entities/notification.entity';

// Load environment variables
dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'healthtrackdb',
  entities: [User, Role, Permission, Program, Medication, Patient, PatientEnrollment, Dispensation, Attendance, ActivityLog, Notification],
  synchronize: true, // Use synchronize for reset to create all tables from entities
  logging: false,
});

async function resetAndSeed() {
  console.log('🔄 Connecting to database...');
  
  try {
    await AppDataSource.initialize();
    console.log('✅ Connected to database');

    // Drop all tables
    console.log('\n🗑️  Dropping all tables...');
    await AppDataSource.query('DROP SCHEMA public CASCADE');
    await AppDataSource.query('CREATE SCHEMA public');
    await AppDataSource.query('GRANT ALL ON SCHEMA public TO postgres');
    await AppDataSource.query('GRANT ALL ON SCHEMA public TO public');
    await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ All tables dropped and UUID extension enabled');

    // Synchronize will create all tables from entities
    console.log('\n📦 Creating tables from entities...');
    await AppDataSource.synchronize();
    console.log('✅ Tables created');

    // Seed database
    console.log('\n🌱 Seeding database with fresh data...');
    await seedSimpleDatabase(AppDataSource);
    console.log('\n✅ Database reset and seeded successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
    console.log('\n👋 Database connection closed');
  }
}

resetAndSeed();
