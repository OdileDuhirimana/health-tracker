import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { subDays, addDays } from 'date-fns';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { Program, ProgramType, ProgramStatus, SessionFrequency, DurationUnit } from '../entities/program.entity';
import { Medication, MedicationFrequency, MedicationStatus } from '../entities/medication.entity';
import { Patient, Gender, PatientStatus } from '../entities/patient.entity';
import { PatientEnrollment } from '../entities/patient-enrollment.entity';
import { Dispensation } from '../entities/dispensation.entity';
import { Attendance, AttendanceStatus } from '../entities/attendance.entity';

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function seedSimpleDatabase(dataSource: DataSource) {
  console.log('🌱 Starting simple seed with manageable data...');

  const userRepo = dataSource.getRepository(User);
  const programRepo = dataSource.getRepository(Program);
  const medicationRepo = dataSource.getRepository(Medication);
  const patientRepo = dataSource.getRepository(Patient);
  const enrollmentRepo = dataSource.getRepository(PatientEnrollment);
  const dispensationRepo = dataSource.getRepository(Dispensation);
  const attendanceRepo = dataSource.getRepository(Attendance);

  const passwordHash = await bcrypt.hash('password123', 10);

  // ===== CREATE USERS =====
  console.log('👥 Creating users...');
  const users: User[] = [];

  // 3 Admins
  for (let i = 1; i <= 3; i++) {
    const admin = userRepo.create({
      name: `Dr. Admin ${i}`,
      email: `admin${i}@healthtrack.app`,
      password: passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });
    users.push(await userRepo.save(admin));
  }

  // 10 Nurses (Healthcare Staff)
  const nurses: User[] = [];
  const nurseNames = [
    'Nurse Sarah Johnson', 'Nurse Michael Brown', 'Nurse Emily Davis',
    'Nurse James Wilson', 'Nurse Maria Garcia', 'Nurse David Lee',
    'Nurse Jennifer White', 'Nurse Robert Taylor', 'Nurse Lisa Anderson',
    'Nurse Christopher Martinez'
  ];
  
  for (let i = 0; i < 10; i++) {
    const nurse = userRepo.create({
      name: nurseNames[i],
      email: `nurse${i + 1}@healthtrack.app`,
      password: passwordHash,
      role: UserRole.HEALTHCARE_STAFF,
      status: UserStatus.ACTIVE,
    });
    const saved = await userRepo.save(nurse);
    users.push(saved);
    nurses.push(saved);
  }

  console.log(`✅ Created ${users.length} users (3 admins, 10 nurses)`);

  // ===== CREATE 25 MEDICATIONS =====
  console.log('💊 Creating 25 medications...');
  const medicationsData = [
    // Mental Health (5)
    { name: 'Sertraline', dosage: '50mg', frequency: MedicationFrequency.DAILY, type: 'Mental Health' },
    { name: 'Fluoxetine', dosage: '20mg', frequency: MedicationFrequency.DAILY, type: 'Mental Health' },
    { name: 'Alprazolam', dosage: '0.5mg', frequency: MedicationFrequency.TWICE_DAILY, type: 'Mental Health' },
    { name: 'Lorazepam', dosage: '1mg', frequency: MedicationFrequency.DAILY, type: 'Mental Health' },
    { name: 'Escitalopram', dosage: '10mg', frequency: MedicationFrequency.DAILY, type: 'Mental Health' },
    
    // Diabetes (5)
    { name: 'Metformin', dosage: '500mg', frequency: MedicationFrequency.TWICE_DAILY, type: 'Diabetes' },
    { name: 'Insulin Glargine', dosage: '10 units', frequency: MedicationFrequency.DAILY, type: 'Diabetes' },
    { name: 'Glipizide', dosage: '5mg', frequency: MedicationFrequency.DAILY, type: 'Diabetes' },
    { name: 'Sitagliptin', dosage: '100mg', frequency: MedicationFrequency.DAILY, type: 'Diabetes' },
    { name: 'Insulin Lispro', dosage: '5 units', frequency: MedicationFrequency.TWICE_DAILY, type: 'Diabetes' },
    
    // Vaccination (5)
    { name: 'Flu Vaccine', dosage: '0.5ml', frequency: MedicationFrequency.MONTHLY, type: 'Vaccination' },
    { name: 'COVID-19 Vaccine', dosage: '0.3ml', frequency: MedicationFrequency.MONTHLY, type: 'Vaccination' },
    { name: 'Hepatitis B Vaccine', dosage: '1ml', frequency: MedicationFrequency.MONTHLY, type: 'Vaccination' },
    { name: 'Tetanus Vaccine', dosage: '0.5ml', frequency: MedicationFrequency.MONTHLY, type: 'Vaccination' },
    { name: 'MMR Vaccine', dosage: '0.5ml', frequency: MedicationFrequency.MONTHLY, type: 'Vaccination' },
    
    // Other/General (10)
    { name: 'Lisinopril', dosage: '10mg', frequency: MedicationFrequency.DAILY, type: 'Other' },
    { name: 'Amlodipine', dosage: '5mg', frequency: MedicationFrequency.DAILY, type: 'Other' },
    { name: 'Atorvastatin', dosage: '20mg', frequency: MedicationFrequency.DAILY, type: 'Other' },
    { name: 'Omeprazole', dosage: '20mg', frequency: MedicationFrequency.DAILY, type: 'Other' },
    { name: 'Levothyroxine', dosage: '75mcg', frequency: MedicationFrequency.DAILY, type: 'Other' },
    { name: 'Albuterol', dosage: '90mcg', frequency: MedicationFrequency.TWICE_DAILY, type: 'Other' },
    { name: 'Prednisone', dosage: '10mg', frequency: MedicationFrequency.DAILY, type: 'Other' },
    { name: 'Gabapentin', dosage: '300mg', frequency: MedicationFrequency.DAILY, type: 'Other' },
    { name: 'Vitamin D3', dosage: '2000 IU', frequency: MedicationFrequency.WEEKLY, type: 'Other' },
    { name: 'Aspirin', dosage: '81mg', frequency: MedicationFrequency.DAILY, type: 'Other' },
  ];

  const medications: Medication[] = [];
  for (let i = 0; i < medicationsData.length; i++) {
    const med = medicationRepo.create({
      ...medicationsData[i],
      status: MedicationStatus.ACTIVE,
      medicationId: `M-${String(i + 1).padStart(3, '0')}`,
    });
    medications.push(await medicationRepo.save(med));
  }
  console.log(`✅ Created ${medications.length} medications`);

  // ===== CREATE 20 PROGRAMS =====
  console.log('📋 Creating 20 programs...');
  const programsData = [
    // Mental Health Programs (5)
    { name: 'Mental Health Support Program', type: ProgramType.MENTAL_HEALTH, sessionFreq: SessionFrequency.WEEKLY, duration: 12, durationUnit: DurationUnit.WEEKS },
    { name: 'Anxiety Management', type: ProgramType.MENTAL_HEALTH, sessionFreq: SessionFrequency.WEEKLY, duration: 8, durationUnit: DurationUnit.WEEKS },
    { name: 'Depression Treatment', type: ProgramType.MENTAL_HEALTH, sessionFreq: SessionFrequency.WEEKLY, duration: 16, durationUnit: DurationUnit.WEEKS },
    { name: 'Substance Abuse Recovery', type: ProgramType.MENTAL_HEALTH, sessionFreq: SessionFrequency.DAILY, duration: 90, durationUnit: DurationUnit.DAYS },
    { name: 'Mental Health Intensive', type: ProgramType.MENTAL_HEALTH, sessionFreq: SessionFrequency.DAILY, duration: 60, durationUnit: DurationUnit.DAYS },
    
    // Diabetes Programs (5)
    { name: 'Diabetes Management', type: ProgramType.DIABETES, sessionFreq: SessionFrequency.WEEKLY, duration: 6, durationUnit: DurationUnit.MONTHS },
    { name: 'Type 2 Diabetes Control', type: ProgramType.DIABETES, sessionFreq: SessionFrequency.WEEKLY, duration: 12, durationUnit: DurationUnit.WEEKS },
    { name: 'Insulin Management', type: ProgramType.DIABETES, sessionFreq: SessionFrequency.WEEKLY, duration: 8, durationUnit: DurationUnit.WEEKS },
    { name: 'Diabetic Nutrition', type: ProgramType.DIABETES, sessionFreq: SessionFrequency.MONTHLY, duration: 6, durationUnit: DurationUnit.MONTHS },
    { name: 'Blood Sugar Monitoring', type: ProgramType.DIABETES, sessionFreq: SessionFrequency.WEEKLY, duration: 10, durationUnit: DurationUnit.WEEKS },
    
    // Vaccination Programs (5)
    { name: 'Childhood Vaccination', type: ProgramType.VACCINATION, sessionFreq: SessionFrequency.MONTHLY, duration: 18, durationUnit: DurationUnit.MONTHS },
    { name: 'Adult Vaccination Schedule', type: ProgramType.VACCINATION, sessionFreq: SessionFrequency.MONTHLY, duration: 12, durationUnit: DurationUnit.MONTHS },
    { name: 'Flu Prevention Program', type: ProgramType.VACCINATION, sessionFreq: SessionFrequency.MONTHLY, duration: 6, durationUnit: DurationUnit.MONTHS },
    { name: 'Travel Vaccination', type: ProgramType.VACCINATION, sessionFreq: SessionFrequency.MONTHLY, duration: 3, durationUnit: DurationUnit.MONTHS },
    { name: 'Senior Immunization', type: ProgramType.VACCINATION, sessionFreq: SessionFrequency.MONTHLY, duration: 12, durationUnit: DurationUnit.MONTHS },
    
    // Other Programs (5)
    { name: 'Hypertension Control', type: ProgramType.OTHER, sessionFreq: SessionFrequency.MONTHLY, duration: 90, durationUnit: DurationUnit.DAYS },
    { name: 'Cardiac Rehabilitation', type: ProgramType.OTHER, sessionFreq: SessionFrequency.WEEKLY, duration: 8, durationUnit: DurationUnit.WEEKS },
    { name: 'Chronic Pain Management', type: ProgramType.OTHER, sessionFreq: SessionFrequency.WEEKLY, duration: 16, durationUnit: DurationUnit.WEEKS },
    { name: 'Asthma Management', type: ProgramType.OTHER, sessionFreq: SessionFrequency.MONTHLY, duration: 6, durationUnit: DurationUnit.MONTHS },
    { name: 'Post-Surgery Recovery', type: ProgramType.OTHER, sessionFreq: SessionFrequency.DAILY, duration: 45, durationUnit: DurationUnit.DAYS },
  ];

  const programs: Program[] = [];
  for (const progData of programsData) {
    // Assign 2-3 nurses to each program
    const numNurses = randomBetween(2, 3);
    const assignedNurses: User[] = [];
    for (let i = 0; i < numNurses; i++) {
      const nurse = randomElement(nurses);
      if (!assignedNurses.find(n => n.id === nurse.id)) {
        assignedNurses.push(nurse);
      }
    }

    // Assign medications based on program type
    let assignedMeds: Medication[] = [];
    if (progData.type === ProgramType.MENTAL_HEALTH) {
      assignedMeds = medications.filter(m => m.name.includes('Sertraline') || m.name.includes('Fluoxetine') || m.name.includes('Alprazolam')).slice(0, 2);
    } else if (progData.type === ProgramType.DIABETES) {
      assignedMeds = medications.filter(m => m.name.includes('Metformin') || m.name.includes('Insulin')).slice(0, 2);
    } else if (progData.type === ProgramType.VACCINATION) {
      assignedMeds = medications.filter(m => m.name.includes('Vaccine')).slice(0, 2);
    } else {
      assignedMeds = medications.filter(m => medicationsData.find(md => md.name === m.name && md.type === 'Other')).slice(0, 2);
    }

    // Calculate durationInDays
    const durationMultipliers: Record<string, number> = {
      [DurationUnit.DAYS]: 1,
      [DurationUnit.WEEKS]: 7,
      [DurationUnit.MONTHS]: 30,
    };
    const durationInDays = progData.duration * (durationMultipliers[progData.durationUnit] || 1);

    const program = programRepo.create({
      name: progData.name,
      type: progData.type,
      description: `${progData.name} providing comprehensive care and support.`,
      status: ProgramStatus.ACTIVE,
      sessionFrequency: progData.sessionFreq,
      duration: progData.duration,
      durationUnit: progData.durationUnit,
      durationInDays: durationInDays,
      medications: assignedMeds,
      assignedStaff: assignedNurses,
    });
    
    const saved = await programRepo.save(program);
    const withRelations = await programRepo.findOne({
      where: { id: saved.id },
      relations: ['assignedStaff', 'medications'],
    });
    programs.push(withRelations || saved);
  }
  console.log(`✅ Created ${programs.length} programs`);

  // ===== CREATE 30 PATIENTS =====
  console.log('🏥 Creating 30 patients...');
  const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
    'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen',
    'Charles', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee',
    'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker'];

  const patients: Patient[] = [];
  for (let i = 0; i < 30; i++) {
    const firstName = firstNames[i];
    const lastName = lastNames[i];
    const patient = patientRepo.create({
      fullName: `${firstName} ${lastName}`,
      dateOfBirth: subDays(new Date(), randomBetween(18 * 365, 70 * 365)),
      gender: randomElement([Gender.MALE, Gender.FEMALE]),
      contactNumber: `555-${String(randomBetween(100, 999))}-${String(randomBetween(1000, 9999))}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      address: `${randomBetween(100, 9999)} Main St, City, State`,
      emergencyContact: `Emergency Contact ${i + 1}`,
      medicalNotes: randomElement(['No known allergies', 'Allergic to penicillin', 'Hypertension', '']),
      status: PatientStatus.ACTIVE,
      patientId: `P-${String(1001 + i)}`,
    });
    patients.push(await patientRepo.save(patient));
  }
  console.log(`✅ Created ${patients.length} patients`);

  // ===== CREATE ENROLLMENTS (Each patient in 1-2 programs) =====
  console.log('📝 Creating patient enrollments...');
  const enrollments: PatientEnrollment[] = [];
  
  for (const patient of patients) {
    const numEnrollments = randomBetween(1, 2);
    const selectedPrograms: Program[] = [];
    
    for (let i = 0; i < numEnrollments; i++) {
      const program = randomElement(programs);
      if (!selectedPrograms.find(p => p.id === program.id)) {
        selectedPrograms.push(program);
      }
    }

    for (const program of selectedPrograms) {
      const enrollmentDate = subDays(new Date(), randomBetween(30, 90));
      const completedDate = addDays(enrollmentDate, program.durationInDays || 90);
      const assignedNurse = program.assignedStaff && program.assignedStaff.length > 0 
        ? randomElement(program.assignedStaff) 
        : randomElement(nurses);

      const enrollment = enrollmentRepo.create({
        patientId: patient.id,
        programId: program.id,
        assignedStaffId: assignedNurse.id,
        enrollmentDate,
        completedDate,
      });
      enrollments.push(await enrollmentRepo.save(enrollment));
    }
  }
  console.log(`✅ Created ${enrollments.length} enrollments`);

  // ===== CREATE ATTENDANCE RECORDS (5-10 per enrollment) =====
  console.log('📅 Creating attendance records...');
  let attendanceCount = 0;
  
  for (const enrollment of enrollments) {
    const numRecords = randomBetween(5, 10);
    const enrollmentDate = new Date(enrollment.enrollmentDate);
    
    for (let i = 0; i < numRecords; i++) {
      const attendanceDate = addDays(enrollmentDate, i * 7); // Weekly attendance
      const status = randomElement([
        AttendanceStatus.PRESENT,
        AttendanceStatus.PRESENT,
        AttendanceStatus.PRESENT,
        AttendanceStatus.LATE,
        AttendanceStatus.ABSENT,
      ]);

      const attendance = attendanceRepo.create({
        patientId: enrollment.patientId,
        programId: enrollment.programId,
        attendanceDate,
        status,
        checkInTime: status === AttendanceStatus.PRESENT || status === AttendanceStatus.LATE ? attendanceDate : null,
        markedById: enrollment.assignedStaffId,
      });
      await attendanceRepo.save(attendance);
      attendanceCount++;
    }
  }
  console.log(`✅ Created ${attendanceCount} attendance records`);

  // ===== CREATE 100 DISPENSATIONS =====
  console.log('💉 Creating 100 dispensations...');
  const programsWithMeds = await programRepo.find({ relations: ['medications'] });
  
  for (let i = 0; i < 100; i++) {
    const enrollment = randomElement(enrollments);
    const program = programsWithMeds.find(p => p.id === enrollment.programId);
    
    if (program && program.medications && program.medications.length > 0) {
      const medication = randomElement(program.medications);
      const dispensedAt = subDays(new Date(), randomBetween(1, 60));

      const dispensation = dispensationRepo.create({
        patientId: enrollment.patientId,
        programId: enrollment.programId,
        medicationId: medication.id,
        dispensedAt,
        notes: randomElement([null, 'Patient compliance good', 'Reminder given', '']),
        dispensedById: enrollment.assignedStaffId,
      });
      await dispensationRepo.save(dispensation);
    }
  }
  console.log(`✅ Created 100 dispensations`);

  // ===== SUMMARY =====
  console.log('\n✅ Simple seed completed successfully!');
  console.log('\n📊 Database Summary:');
  console.log(`   👥 Users: ${users.length} (3 admins, 10 nurses)`);
  console.log(`   💊 Medications: ${medications.length} (across different program types)`);
  console.log(`   📋 Programs: ${programs.length} (with nurses assigned)`);
  console.log(`   🏥 Patients: ${patients.length}`);
  console.log(`   📝 Enrollments: ${enrollments.length} (patients enrolled in programs)`);
  console.log(`   📅 Attendance Records: ${attendanceCount}`);
  console.log(`   💉 Dispensations: 100 (for different patients and nurses)`);
  console.log('\n🔑 Login Credentials (all passwords: password123):');
  console.log('   Admin: admin1@healthtrack.app');
  console.log('   Nurse: nurse1@healthtrack.app');
  console.log('\n🎉 Your database is now populated with manageable, realistic data!');
}
