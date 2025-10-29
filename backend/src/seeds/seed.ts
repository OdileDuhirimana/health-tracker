import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { subMonths, subDays, subWeeks, addDays, startOfDay, format } from 'date-fns';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { Program, ProgramType, ProgramStatus, SessionFrequency } from '../entities/program.entity';
import { Medication, MedicationFrequency, MedicationStatus } from '../entities/medication.entity';
import { Patient, Gender, PatientStatus } from '../entities/patient.entity';
import { PatientEnrollment } from '../entities/patient-enrollment.entity';
import { Dispensation } from '../entities/dispensation.entity';
import { Attendance, AttendanceStatus } from '../entities/attendance.entity';
import { ActivityLog, ActivityType } from '../entities/activity-log.entity';
import { Notification, NotificationType } from '../entities/notification.entity';

// Helper function to get random element from array
function randomElement<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error('Cannot get random element from empty array');
  }
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to get random number between min and max
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to get random date between two dates
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to generate patient ID
async function generatePatientId(patientRepo: any, startNumber: number = 1001): Promise<string> {
  const lastPatient = await patientRepo
    .createQueryBuilder('patient')
    .where("patient.patientId LIKE 'P-%'")
    .orderBy('patient.patientId', 'DESC')
    .getOne();

  if (!lastPatient) {
    return `P-${startNumber}`;
  }

  const lastNumber = parseInt(lastPatient.patientId.replace('P-', ''));
  return `P-${lastNumber + 1}`;
}

// Helper function to generate medication ID
function generateMedicationId(index: number): string {
  return `M-${String(index).padStart(3, '0')}`;
}

export async function seedDatabase(dataSource: DataSource) {
  const now = new Date();
  const sixMonthsAgo = subMonths(now, 6);
  const threeMonthsAgo = subMonths(now, 3);
  const oneMonthAgo = subMonths(now, 1);

  console.log(' Starting comprehensive seed...');
  console.log(` Simulating data from ${format(sixMonthsAgo, 'yyyy-MM-dd')} to ${format(now, 'yyyy-MM-dd')}`);

  const userRepository = dataSource.getRepository(User);
  const programRepository = dataSource.getRepository(Program);
  const medicationRepository = dataSource.getRepository(Medication);
  const patientRepository = dataSource.getRepository(Patient);
  const enrollmentRepository = dataSource.getRepository(PatientEnrollment);
  const dispensationRepository = dataSource.getRepository(Dispensation);
  const attendanceRepository = dataSource.getRepository(Attendance);
  const activityLogRepository = dataSource.getRepository(ActivityLog);
  const notificationRepository = dataSource.getRepository(Notification);

  // ===== CREATE USERS =====
  console.log('👥 Creating users...');
  const users: User[] = [];
  const passwordHash = await bcrypt.hash('password123', 10);

  // Create 5 Admins
  const adminNames = [
    'Dr. Sarah Johnson', 'Dr. Michael Chen', 'Dr. Emily Rodriguez',
    'Dr. James Wilson', 'Dr. Lisa Anderson'
  ];
  for (let i = 0; i < adminNames.length; i++) {
    const admin = userRepository.create({
      name: adminNames[i],
      email: `admin${i + 1}@healthtrack.app`,
      password: passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });
    users.push(await userRepository.save(admin));
  }

  // Create 20 Healthcare Staff
  const staffNames = [
    'Nurse Mary Thompson', 'Nurse John Smith', 'Nurse Patricia Brown',
    'Nurse Robert Davis', 'Nurse Jennifer Garcia', 'Nurse William Martinez',
    'Nurse Linda Lee', 'Nurse David White', 'Nurse Susan Harris',
    'Nurse Richard Clark', 'Nurse Jessica Lewis', 'Nurse Joseph Walker',
    'Nurse Karen Hall', 'Nurse Thomas Allen', 'Nurse Nancy Young',
    'Nurse Charles King', 'Nurse Betty Wright', 'Nurse Christopher Lopez',
    'Nurse Dorothy Hill', 'Nurse Daniel Green'
  ];
  const healthcareStaff: User[] = [];
  for (let i = 0; i < staffNames.length; i++) {
    const staff = userRepository.create({
      name: staffNames[i],
      email: `staff${i + 1}@healthtrack.app`,
      password: passwordHash,
      role: UserRole.HEALTHCARE_STAFF,
      status: UserStatus.ACTIVE,
    });
    const saved = await userRepository.save(staff);
    users.push(saved);
    healthcareStaff.push(saved);
  }

  // Create 3 Guest users
  for (let i = 1; i <= 3; i++) {
    const guest = userRepository.create({
      name: `Guest User ${i}`,
      email: `guest${i}@healthtrack.app`,
      password: passwordHash,
      role: UserRole.GUEST,
      status: UserStatus.ACTIVE,
    });
    users.push(await userRepository.save(guest));
  }

  console.log(`Created ${users.length} users (${adminNames.length} admins, ${healthcareStaff.length} staff, 3 guests)`);

  // ===== CREATE MEDICATIONS =====
  console.log('Creating medications...');
  const medicationsData = [
    // Daily medications
    { name: 'Sertraline', dosage: '50mg', frequency: MedicationFrequency.DAILY },
    { name: 'Atenolol', dosage: '25mg', frequency: MedicationFrequency.DAILY },
    { name: 'Atorvastatin', dosage: '20mg', frequency: MedicationFrequency.DAILY },
    { name: 'Levothyroxine', dosage: '75mcg', frequency: MedicationFrequency.DAILY },
    { name: 'Metoprolol', dosage: '50mg', frequency: MedicationFrequency.DAILY },
    { name: 'Omeprazole', dosage: '20mg', frequency: MedicationFrequency.DAILY },
    { name: 'Amlodipine', dosage: '5mg', frequency: MedicationFrequency.DAILY },
    { name: 'Lisinopril', dosage: '10mg', frequency: MedicationFrequency.DAILY },
    { name: 'Albuterol', dosage: '90mcg', frequency: MedicationFrequency.DAILY },
    { name: 'Furosemide', dosage: '40mg', frequency: MedicationFrequency.DAILY },
    
    // Twice Daily
    { name: 'Metformin', dosage: '500mg', frequency: MedicationFrequency.TWICE_DAILY },
    { name: 'Amoxicillin', dosage: '250mg', frequency: MedicationFrequency.TWICE_DAILY },
    { name: 'Cephalexin', dosage: '500mg', frequency: MedicationFrequency.TWICE_DAILY },
    { name: 'Doxycycline', dosage: '100mg', frequency: MedicationFrequency.TWICE_DAILY },
    
    // Weekly
    { name: 'Alendronate', dosage: '70mg', frequency: MedicationFrequency.WEEKLY },
    { name: 'Methotrexate', dosage: '10mg', frequency: MedicationFrequency.WEEKLY },
    
    // Monthly
    { name: 'Vitamin D3', dosage: '50000 IU', frequency: MedicationFrequency.MONTHLY },
    { name: 'B12 Injection', dosage: '1000mcg', frequency: MedicationFrequency.MONTHLY },
    { name: 'Testosterone', dosage: '200mg', frequency: MedicationFrequency.MONTHLY },
    { name: 'Iron Injection', dosage: '100mg', frequency: MedicationFrequency.MONTHLY },
  ];

  const medications: Medication[] = [];
  for (let i = 0; i < medicationsData.length; i++) {
    const med = medicationRepository.create({
      ...medicationsData[i],
      status: MedicationStatus.ACTIVE,
      medicationId: generateMedicationId(i + 1),
    });
    medications.push(await medicationRepository.save(med));
  }
  console.log(` Created ${medications.length} medications`);

  // ===== CREATE PROGRAMS =====
  console.log(' Creating programs...');
  const programsData = [
    { name: 'Mental Health Support Program', type: ProgramType.MENTAL_HEALTH, sessionFreq: SessionFrequency.WEEKLY, duration: 12, durationUnit: 'weeks' },
    { name: 'Diabetes Management', type: ProgramType.DIABETES, sessionFreq: SessionFrequency.WEEKLY, duration: 6, durationUnit: 'months' },
    { name: 'Hypertension Control', type: ProgramType.OTHER, sessionFreq: SessionFrequency.MONTHLY, duration: 90, durationUnit: 'days' },
    { name: 'Childhood Vaccination', type: ProgramType.VACCINATION, sessionFreq: SessionFrequency.MONTHLY, duration: 18, durationUnit: 'months' },
    { name: 'Adult Vaccination Schedule', type: ProgramType.VACCINATION, sessionFreq: SessionFrequency.MONTHLY, duration: 12, durationUnit: 'months' },
    { name: 'Cardiac Rehabilitation', type: ProgramType.OTHER, sessionFreq: SessionFrequency.WEEKLY, duration: 8, durationUnit: 'weeks' },
    { name: 'Asthma Management', type: ProgramType.OTHER, sessionFreq: SessionFrequency.MONTHLY, duration: 6, durationUnit: 'months' },
    { name: 'Women\'s Health Program', type: ProgramType.OTHER, sessionFreq: SessionFrequency.MONTHLY, duration: 12, durationUnit: 'months' },
    { name: 'Geriatric Care Program', type: ProgramType.OTHER, sessionFreq: SessionFrequency.WEEKLY, duration: 24, durationUnit: 'weeks' },
    { name: 'Chronic Pain Management', type: ProgramType.OTHER, sessionFreq: SessionFrequency.WEEKLY, duration: 16, durationUnit: 'weeks' },
    { name: 'Substance Abuse Recovery', type: ProgramType.MENTAL_HEALTH, sessionFreq: SessionFrequency.DAILY, duration: 90, durationUnit: 'days' },
    { name: 'Post-Surgery Recovery', type: ProgramType.OTHER, sessionFreq: SessionFrequency.DAILY, duration: 45, durationUnit: 'days' },
    { name: 'Nutrition & Wellness', type: ProgramType.OTHER, sessionFreq: SessionFrequency.WEEKLY, duration: 10, durationUnit: 'weeks' },
    { name: 'Mental Health Intensive', type: ProgramType.MENTAL_HEALTH, sessionFreq: SessionFrequency.DAILY, duration: 60, durationUnit: 'days' },
  ];

  const programs: Program[] = [];
  for (const progData of programsData) {
    // Assign random medications based on program type
    let assignedMeds: Medication[] = [];
    if (progData.type === ProgramType.DIABETES) {
      assignedMeds = medications.filter(m => m.name === 'Metformin' || m.name === 'Atorvastatin');
    } else if (progData.type === ProgramType.MENTAL_HEALTH) {
      assignedMeds = medications.filter(m => m.name === 'Sertraline' || m.name === 'Alprazolam');
    } else {
      assignedMeds = [randomElement(medications), randomElement(medications)].filter((v, i, a) => a.indexOf(v) === i);
    }

    // Assign random staff (2-4 staff per program)
    const numStaff = randomBetween(2, 4);
    const assignedStaff = [];
    for (let i = 0; i < numStaff; i++) {
      const staff = randomElement(healthcareStaff);
      if (!assignedStaff.find(s => s.id === staff.id)) {
        assignedStaff.push(staff);
      }
    }

    // Calculate durationInDays
    const durationMultipliers: Record<string, number> = {
      'days': 1,
      'weeks': 7,
      'months': 30,
    };
    const durationInDays = progData.duration * (durationMultipliers[progData.durationUnit] || 1);

    const program = programRepository.create({
      name: progData.name,
      type: progData.type,
      description: `${progData.name} providing comprehensive care and support.`,
      status: ProgramStatus.ACTIVE,
      sessionFrequency: progData.sessionFreq,
      duration: progData.duration,
      durationUnit: progData.durationUnit as any,
      durationInDays: durationInDays,
      medications: assignedMeds,
      assignedStaff: assignedStaff,
    });
    const savedProgram = await programRepository.save(program);
    // Reload with relations to ensure assignedStaff is available
    const programWithRelations = await programRepository.findOne({
      where: { id: savedProgram.id },
      relations: ['assignedStaff'],
    });
    if (programWithRelations) {
      programs.push(programWithRelations);
    } else {
      programs.push(savedProgram);
    }
  }
  console.log(` Created ${programs.length} programs`);

  // ===== CREATE PATIENTS =====
  console.log(' Creating patients...');
  const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
    'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen',
    'Charles', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra',
    'Donald', 'Ashley', 'Steven', 'Kimberly', 'Andrew', 'Emily', 'Paul', 'Donna', 'Joshua', 'Michelle'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee',
    'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
    'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green'];

  const patients: Patient[] = [];
  const numPatients = 120; // Create 120 patients

  for (let i = 0; i < numPatients; i++) {
    const firstName = randomElement(firstNames);
    const lastName = randomElement(lastNames);
    const fullName = `${firstName} ${lastName}`;
    
    // Generate date of birth (ages between 18-85)
    const age = randomBetween(18, 85);
    const dateOfBirth = subMonths(now, age * 12 + randomBetween(0, 11));
    
    const gender = randomElement([Gender.MALE, Gender.FEMALE, Gender.OTHER]);
    const contactNumber = `555-${String(randomBetween(100, 999))}-${String(randomBetween(1000, 9999))}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`;
    
    const patient = patientRepository.create({
      fullName,
      dateOfBirth,
      gender,
      contactNumber,
      email,
      address: `${randomBetween(100, 9999)} ${randomElement(['Main', 'Oak', 'Park', 'Elm', 'Maple', 'Cedar'])} St, City, State`,
      emergencyContact: `Emergency Contact ${randomBetween(1, 100)}`,
      medicalNotes: randomElement(['No known allergies', 'Allergic to penicillin', 'Hypertension', 'Diabetes type 2', 'Asthma', '']),
      status: randomBetween(0, 10) > 1 ? PatientStatus.ACTIVE : PatientStatus.INACTIVE,
      patientId: await generatePatientId(patientRepository, 1001 + i),
    });
    patients.push(await patientRepository.save(patient));
    
    if ((i + 1) % 20 === 0) {
      console.log(`   Created ${i + 1}/${numPatients} patients...`);
    }
  }
  console.log(` Created ${patients.length} patients`);

  // ===== CREATE ENROLLMENTS =====
  console.log(' Creating patient enrollments...');
  const enrollments: PatientEnrollment[] = [];
  let enrollmentCount = 0;

  for (const patient of patients.filter(p => p.status === PatientStatus.ACTIVE)) {
    // Each active patient enrolled in 1-3 programs
    const numEnrollments = randomBetween(1, 3);
    const selectedPrograms = [];
    
    for (let i = 0; i < numEnrollments; i++) {
      const program = randomElement(programs);
      if (!selectedPrograms.find(p => p.id === program.id)) {
        selectedPrograms.push(program);
      }
    }

    for (const program of selectedPrograms) {
      // Enrollment date between 6 months ago and now
      const enrollmentDate = randomDate(sixMonthsAgo, now);
      const assignedStaff: User = program.assignedStaff && program.assignedStaff.length > 0 
        ? randomElement(program.assignedStaff) 
        : randomElement(healthcareStaff);

      // Calculate completedDate from enrollmentDate + program.durationInDays
      const completedDate = addDays(enrollmentDate, program.durationInDays || 90);

      const enrollment = enrollmentRepository.create({
        patientId: patient.id,
        programId: program.id,
        assignedStaffId: assignedStaff.id,
        enrollmentDate,
        completedDate,
      });
      enrollments.push(await enrollmentRepository.save(enrollment));
      enrollmentCount++;
    }
  }
  console.log(` Created ${enrollmentCount} enrollments`);

  // ===== CREATE ATTENDANCE RECORDS =====
  console.log(' Creating attendance records (this may take a while)...');
  let attendanceCount = 0;

  for (const enrollment of enrollments) {
    const program = programs.find(p => p.id === enrollment.programId);
    if (!program) continue;

    const enrollmentDate = new Date(enrollment.enrollmentDate);
    let currentDate = new Date(enrollmentDate);
    
    // Generate attendance based on session frequency
    const endDate = now;
    
    while (currentDate <= endDate) {
      // Skip some sessions (realistic attendance - not 100%)
      const shouldHaveSession = randomBetween(1, 100) > 20; // 80% chance of having a session
      
      if (shouldHaveSession) {
        const status = randomElement([
          AttendanceStatus.PRESENT,
          AttendanceStatus.PRESENT,
          AttendanceStatus.PRESENT,
          AttendanceStatus.LATE,
          AttendanceStatus.ABSENT,
          AttendanceStatus.EXCUSED,
          AttendanceStatus.CANCELED,
        ]);
        
        const checkInTime = status === AttendanceStatus.PRESENT || status === AttendanceStatus.LATE
          ? randomDate(startOfDay(currentDate), addDays(startOfDay(currentDate), 1))
          : null;

        const attendance = attendanceRepository.create({
          patientId: enrollment.patientId,
          programId: enrollment.programId,
          attendanceDate: currentDate,
          status,
          checkInTime,
          notes: status === AttendanceStatus.CANCELED ? randomElement([
            'Weather cancellation',
            'Holiday',
            'Emergency closure',
            'Staff unavailability'
          ]) : null,
          markedById: randomElement(healthcareStaff).id,
        });
        await attendanceRepository.save(attendance);
        attendanceCount++;
      }

      // Move to next session based on frequency
      if (program.sessionFrequency === SessionFrequency.DAILY) {
        currentDate = addDays(currentDate, 1);
      } else if (program.sessionFrequency === SessionFrequency.WEEKLY) {
        currentDate = addDays(currentDate, 7);
      } else if (program.sessionFrequency === SessionFrequency.MONTHLY) {
        currentDate = addDays(currentDate, 30);
      }
    }

    if (attendanceCount % 500 === 0 && attendanceCount > 0) {
      console.log(`   Created ${attendanceCount} attendance records...`);
    }
  }
  console.log(` Created ${attendanceCount} attendance records`);

  // ===== CREATE DISPENSATIONS =====
  console.log(' Creating medication dispensations...');
  let dispensationCount = 0;

  // Get all active enrollments with their program medications
  // Reload programs with medications relation
  const programsWithMeds = await programRepository.find({
    relations: ['medications'],
  });
  
  for (const enrollment of enrollments) {
    const program = programsWithMeds.find(p => p.id === enrollment.programId);
    if (!program || !program.medications || program.medications.length === 0) continue;

    const enrollmentDate = new Date(enrollment.enrollmentDate);
    
    for (const medication of program.medications) {
      let lastDispensed: Date | null = null;
      let currentDate = new Date(enrollmentDate);

      while (currentDate <= now) {
        let shouldDispense = false;
        let nextDate = currentDate;

        if (medication.frequency === MedicationFrequency.DAILY) {
          // Daily - dispense once per day
          shouldDispense = true;
          nextDate = addDays(currentDate, 1);
        } else if (medication.frequency === MedicationFrequency.TWICE_DAILY) {
          // Twice daily - can dispense twice per day (morning and evening)
          if (!lastDispensed || currentDate > lastDispensed) {
            // First dose of the day
            shouldDispense = randomBetween(1, 100) > 5; // 95% chance
            nextDate = addDays(currentDate, 0.5); // Next dose 12 hours later
          } else {
            // Second dose of the day
            shouldDispense = randomBetween(1, 100) > 10; // 90% chance
            nextDate = addDays(currentDate, 0.5); // Next day
          }
        } else if (medication.frequency === MedicationFrequency.WEEKLY) {
          // Weekly - dispense once per week
          shouldDispense = true;
          nextDate = addDays(currentDate, 7);
        } else if (medication.frequency === MedicationFrequency.MONTHLY) {
          // Monthly - dispense once per month
          shouldDispense = true;
          nextDate = addDays(currentDate, 30);
        }

        if (shouldDispense && randomBetween(1, 100) > 8) { // 92% adherence rate
          const dispensedAt = randomDate(
            startOfDay(currentDate),
            addDays(startOfDay(currentDate), medication.frequency === MedicationFrequency.TWICE_DAILY ? 0.5 : 1)
          );

          const dispensation = dispensationRepository.create({
            patientId: enrollment.patientId,
            programId: enrollment.programId,
            medicationId: medication.id,
            dispensedAt,
            notes: randomElement([null, null, null, 'Patient compliance good', 'Reminder given', '']),
            dispensedById: randomElement(healthcareStaff).id,
          });
          await dispensationRepository.save(dispensation);
          lastDispensed = dispensedAt;
          dispensationCount++;
        }

        currentDate = nextDate;

        if (dispensationCount % 500 === 0 && dispensationCount > 0) {
          console.log(`   Created ${dispensationCount} dispensations...`);
        }
      }
    }
  }
  console.log(`✅ Created ${dispensationCount} dispensations`);

  // ===== CREATE ACTIVITY LOGS =====
  console.log('📊 Creating activity logs...');
  let activityCount = 0;

  // Log all enrollments
  for (const enrollment of enrollments.slice(0, 200)) { // Limit to first 200 for performance
    const patient = patients.find(p => p.id === enrollment.patientId);
    const program = programs.find(p => p.id === enrollment.programId);
    if (!patient || !program) continue;

    const activity = activityLogRepository.create({
      type: ActivityType.ENROLLMENT,
      description: `Enrolled ${patient.fullName} in ${program.name}`,
      userId: enrollment.assignedStaffId || healthcareStaff[0].id,
      metadata: { patientId: patient.id, programId: program.id },
      timestamp: enrollment.enrollmentDate,
    });
    await activityLogRepository.save(activity);
    activityCount++;
  }

  // Log sample dispensations
  const sampleDispensations = await dispensationRepository.find({ take: 300 });
  for (const disp of sampleDispensations) {
    const medication = medications.find(m => m.id === disp.medicationId);
    const patient = patients.find(p => p.id === disp.patientId);
    if (!medication || !patient) continue;

    const activity = activityLogRepository.create({
      type: ActivityType.MEDICATION,
      description: `Dispensed ${medication.name} ${medication.dosage} to ${patient.fullName}`,
      userId: disp.dispensedById,
      metadata: { dispensationId: disp.id, patientId: patient.id, medicationId: medication.id },
      timestamp: disp.dispensedAt,
    });
    await activityLogRepository.save(activity);
    activityCount++;
  }

  // Log sample attendance
  const sampleAttendances = await attendanceRepository.find({ take: 200 });
  for (const att of sampleAttendances) {
    const patient = patients.find(p => p.id === att.patientId);
    const program = programs.find(p => p.id === att.programId);
    if (!patient || !program) continue;

    const activity = activityLogRepository.create({
      type: ActivityType.ATTENDANCE,
      description: `Marked ${patient.fullName} as ${att.status} for ${program.name}`,
      userId: att.markedById,
      metadata: { attendanceId: att.id, patientId: patient.id, programId: program.id },
      timestamp: att.attendanceDate,
    });
    await activityLogRepository.save(activity);
    activityCount++;
  }

  console.log(` Created ${activityCount} activity logs`);

  // ===== CREATE NOTIFICATIONS =====
  console.log(' Creating notifications...');
  let notificationCount = 0;

  // Create notifications for recent activities (last month)
  const recentEnrollments = enrollments.filter(e => {
    const enrollDate = new Date(e.enrollmentDate);
    return enrollDate >= oneMonthAgo;
  }).slice(0, 50);

  for (const enrollment of recentEnrollments) {
    const patient = patients.find(p => p.id === enrollment.patientId);
    const program = programs.find(p => p.id === enrollment.programId);
    if (!patient || !program) continue;

    const notification = notificationRepository.create({
      type: NotificationType.ENROLLMENT,
      title: 'New Patient Enrolled',
      message: `${patient.fullName} enrolled in ${program.name}`,
      read: randomBetween(1, 100) > 60, // 40% unread
      link: `/patients/${patient.id}`,
      userId: enrollment.assignedStaffId || healthcareStaff[0].id,
      timestamp: enrollment.enrollmentDate,
    });
    await notificationRepository.save(notification);
    notificationCount++;
  }

  // Create medication notifications
  const recentDispensations = await dispensationRepository.find({
    where: {},
    order: { dispensedAt: 'DESC' },
    take: 100,
  });

  for (const disp of recentDispensations.slice(0, 50)) {
    const medication = medications.find(m => m.id === disp.medicationId);
    const patient = patients.find(p => p.id === disp.patientId);
    if (!medication || !patient) continue;

    const notification = notificationRepository.create({
      type: NotificationType.MEDICATION,
      title: 'Medication Dispensed',
      message: `${medication.name} dispensed to ${patient.fullName}`,
      read: randomBetween(1, 100) > 70, // 30% unread
      link: `/medications`,
      userId: disp.dispensedById,
      timestamp: disp.dispensedAt,
    });
    await notificationRepository.save(notification);
    notificationCount++;
  }

  console.log(` Created ${notificationCount} notifications`);

  // ===== SUMMARY =====
  console.log('\n Seed completed successfully!');
  console.log('\n Database Summary:');
  console.log(`    Users: ${users.length} (${adminNames.length} admins, ${healthcareStaff.length} staff, 3 guests)`);
  console.log(`    Medications: ${medications.length}`);
  console.log(`    Programs: ${programs.length}`);
  console.log(`    Patients: ${patients.length}`);
  console.log(`    Enrollments: ${enrollmentCount}`);
  console.log(`    Attendance Records: ${attendanceCount}`);
  console.log(`    Dispensations: ${dispensationCount}`);
  console.log(`    Activity Logs: ${activityCount}`);
  console.log(`    Notifications: ${notificationCount}`);
  console.log('\n Login Credentials (all passwords: password123):');
  console.log('   Admin: admin1@healthtrack.app');
  console.log('   Staff: staff1@healthtrack.app');
  console.log('   Guest: guest1@healthtrack.app');
  console.log('\n Your database is now populated with months of realistic production data!');
}
