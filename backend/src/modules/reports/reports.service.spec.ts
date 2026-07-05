import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportsService } from './reports.service';
import { Patient, PatientStatus } from '../../entities/patient.entity';
import { Program, ProgramStatus, ProgramType } from '../../entities/program.entity';
import { Medication, MedicationFrequency, MedicationStatus } from '../../entities/medication.entity';
import { Attendance, AttendanceStatus } from '../../entities/attendance.entity';
import { User, UserRole, UserStatus } from '../../entities/user.entity';
import { PatientEnrollment } from '../../entities/patient-enrollment.entity';

/**
 * Unit coverage for `ReportsService` — one of the modules flagged by the
 * hiring-committee audit as untested despite a green CI pipeline. Every
 * report generator builds a TypeORM QueryBuilder and shapes the resulting
 * rows into a flat, presentation-ready object (the format consumed by the
 * CSV/Excel export layer), and four of the five generators branch on
 * `userRole`/`userId` to scope results to a Healthcare Staff account's own
 * assigned patients/programs versus the unscoped Admin view. Both the row
 * mapping and the RBAC scoping are real, easy-to-regress logic, so these
 * tests mock every repository (never touching Postgres) and assert both:
 * (1) the exact shape of mapped rows against small, deliberately
 * non-trivial fixtures, and (2) that the assignedStaffId-scoping
 * `andWhere`/`innerJoin` calls only fire for Healthcare Staff, never Admin.
 *
 * As of the current source, `ReportsService` depends on six repositories
 * only — no `RedisCacheService`/cache-prefix dependency exists yet (unlike
 * `DashboardService`), so none is registered as a provider here. If a
 * caching layer is added to this service later, these tests will fail to
 * compile (`Nest can't resolve dependencies`) rather than silently testing
 * a stale mock, which is the desired failure mode.
 */
describe('ReportsService', () => {
  let service: ReportsService;
  let patientRepository: jest.Mocked<Repository<Patient>>;
  let programRepository: jest.Mocked<Repository<Program>>;
  let medicationRepository: jest.Mocked<Repository<Medication>>;
  let attendanceRepository: jest.Mocked<Repository<Attendance>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let enrollmentRepository: jest.Mocked<Repository<PatientEnrollment>>;

  // Chainable QueryBuilder stub: every builder method returns `this` except
  // the terminal `get*` calls, which resolve to whatever the test configures.
  // Mirrors the convention established in patients.service.spec.ts.
  const createQueryBuilderMock = () => {
    const qb: any = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
      getManyAndCount: jest.fn(),
      getRawMany: jest.fn(),
      getCount: jest.fn(),
    };
    return qb;
  };

  const buildPatient = (overrides: Partial<Patient> = {}): Patient =>
    ({
      id: 'patient-1',
      patientId: 'P-1001',
      fullName: 'John Doe',
      email: 'john@example.com',
      status: PatientStatus.ACTIVE,
      enrollments: [],
      ...overrides,
    }) as Patient;

  const buildProgram = (overrides: Partial<Program> = {}): Program =>
    ({
      id: 'program-1',
      name: 'Diabetes Care',
      type: ProgramType.DIABETES,
      status: ProgramStatus.ACTIVE,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      ...overrides,
    }) as Program;

  const buildMedication = (overrides: Partial<Medication> = {}): Medication =>
    ({
      id: 'med-1',
      name: 'Amoxicillin',
      dosage: '500mg',
      frequency: MedicationFrequency.DAILY,
      status: MedicationStatus.ACTIVE,
      programs: [],
      ...overrides,
    }) as Medication;

  const buildAttendance = (overrides: Partial<Attendance> = {}): Attendance =>
    ({
      id: 'att-1',
      patientId: 'patient-1',
      programId: 'program-1',
      status: AttendanceStatus.PRESENT,
      ...overrides,
    }) as Attendance;

  const buildUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-1',
      name: 'Jane Staff',
      email: 'jane@example.com',
      role: UserRole.HEALTHCARE_STAFF,
      status: UserStatus.ACTIVE,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      assignedPrograms: [],
      ...overrides,
    }) as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(Patient), useValue: { createQueryBuilder: jest.fn() } },
        {
          provide: getRepositoryToken(Program),
          useValue: { createQueryBuilder: jest.fn() },
        },
        { provide: getRepositoryToken(Medication), useValue: { createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(Attendance), useValue: { createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(User), useValue: { createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(PatientEnrollment), useValue: { count: jest.fn() } },
      ],
    }).compile();

    service = module.get(ReportsService);
    patientRepository = module.get(getRepositoryToken(Patient));
    programRepository = module.get(getRepositoryToken(Program));
    medicationRepository = module.get(getRepositoryToken(Medication));
    attendanceRepository = module.get(getRepositoryToken(Attendance));
    userRepository = module.get(getRepositoryToken(User));
    enrollmentRepository = module.get(getRepositoryToken(PatientEnrollment));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generatePatientReport', () => {
    it('maps enrolled and unenrolled patients to flat report rows', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([
        buildPatient({
          patientId: 'P-1001',
          fullName: 'John Doe',
          email: 'john@example.com',
          enrollments: [
            {
              enrollmentDate: new Date('2024-02-01'),
              program: { name: 'Diabetes Care' },
            } as any,
          ],
        }),
        // A patient with no enrollments and no email exercises the
        // optional-chaining fallbacks ('' rather than undefined).
        buildPatient({
          patientId: 'P-1002',
          fullName: 'No Program Patient',
          email: undefined,
          enrollments: [],
        }),
      ]);
      patientRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.generatePatientReport();

      expect(result).toEqual([
        {
          id: 'P-1001',
          name: 'John Doe',
          email: 'john@example.com',
          program: 'Diabetes Care',
          enrollmentDate: new Date('2024-02-01'),
          status: PatientStatus.ACTIVE,
        },
        {
          id: 'P-1002',
          name: 'No Program Patient',
          email: '',
          program: '',
          enrollmentDate: '',
          status: PatientStatus.ACTIVE,
        },
      ]);
    });

    it('does not scope the query for an Admin caller', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([]);
      patientRepository.createQueryBuilder.mockReturnValue(qb);

      await service.generatePatientReport(undefined, UserRole.ADMIN, 'admin-1');

      expect(qb.andWhere).not.toHaveBeenCalledWith(
        'enrollments.assignedStaffId = :userId',
        expect.anything(),
      );
    });

    it('scopes the query to the assigned staff member for Healthcare Staff', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([]);
      patientRepository.createQueryBuilder.mockReturnValue(qb);

      await service.generatePatientReport(undefined, UserRole.HEALTHCARE_STAFF, 'staff-1');

      expect(qb.andWhere).toHaveBeenCalledWith('enrollments.assignedStaffId = :userId', {
        userId: 'staff-1',
      });
    });

    it('applies the programId filter regardless of role', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([]);
      patientRepository.createQueryBuilder.mockReturnValue(qb);

      await service.generatePatientReport({ programId: 'program-1' }, UserRole.ADMIN, 'admin-1');

      expect(qb.andWhere).toHaveBeenCalledWith('program.id = :programId', {
        programId: 'program-1',
      });
    });
  });

  describe('generateProgramReport', () => {
    it('maps programs to flat report rows with their unscoped patient counts for an Admin', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([
        buildProgram({ id: 'program-1', name: 'Diabetes Care', type: ProgramType.DIABETES }),
        buildProgram({ id: 'program-2', name: 'Vaccination Drive', type: ProgramType.VACCINATION }),
      ]);
      programRepository.createQueryBuilder.mockReturnValue(qb);
      enrollmentRepository.count.mockResolvedValueOnce(5).mockResolvedValueOnce(2);

      const result = await service.generateProgramReport(undefined, UserRole.ADMIN, 'admin-1');

      expect(enrollmentRepository.count).toHaveBeenNthCalledWith(1, { where: { programId: 'program-1' } });
      expect(enrollmentRepository.count).toHaveBeenNthCalledWith(2, { where: { programId: 'program-2' } });
      expect(result).toEqual([
        {
          'Program Name': 'Diabetes Care',
          Type: ProgramType.DIABETES,
          'Total Patients': 5,
          Status: ProgramStatus.ACTIVE,
          'Created Date': new Date('2024-01-01T00:00:00.000Z'),
        },
        {
          'Program Name': 'Vaccination Drive',
          Type: ProgramType.VACCINATION,
          'Total Patients': 2,
          Status: ProgramStatus.ACTIVE,
          'Created Date': new Date('2024-01-01T00:00:00.000Z'),
        },
      ]);
    });

    it('scopes both the program query and the per-program patient count to the assigned staff member', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([buildProgram({ id: 'program-1' })]);
      programRepository.createQueryBuilder.mockReturnValue(qb);
      enrollmentRepository.count.mockResolvedValueOnce(1);

      await service.generateProgramReport(undefined, UserRole.HEALTHCARE_STAFF, 'staff-1');

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('enrollment.assignedStaffId = :userId'),
        { userId: 'staff-1' },
      );
      expect(enrollmentRepository.count).toHaveBeenCalledWith({
        where: { programId: 'program-1', assignedStaffId: 'staff-1' },
      });
    });

    it('applies the startDate/endDate BETWEEN filter only when both are supplied', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([]);
      programRepository.createQueryBuilder.mockReturnValue(qb);

      await service.generateProgramReport(
        { startDate: '2024-01-01', endDate: '2024-01-31' },
        UserRole.ADMIN,
        'admin-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith('program.createdAt BETWEEN :startDate AND :endDate', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
    });
  });

  describe('generateMedicationReport', () => {
    it('maps medications with joined program names into a comma-separated column', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([
        buildMedication({
          name: 'Amoxicillin',
          dosage: '500mg',
          frequency: MedicationFrequency.DAILY,
          status: MedicationStatus.ACTIVE,
          programs: [{ name: 'Diabetes Care' } as Program, { name: 'Vaccination Drive' } as Program],
        }),
        // No assigned programs exercises the '' fallback.
        buildMedication({ name: 'Ibuprofen', programs: [] }),
      ]);
      medicationRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.generateMedicationReport();

      expect(result).toEqual([
        {
          Medication: 'Amoxicillin',
          Dosage: '500mg',
          Frequency: MedicationFrequency.DAILY,
          'Assigned Programs': 'Diabetes Care, Vaccination Drive',
          Status: MedicationStatus.ACTIVE,
        },
        {
          Medication: 'Ibuprofen',
          Dosage: '500mg',
          Frequency: MedicationFrequency.DAILY,
          'Assigned Programs': '',
          Status: MedicationStatus.ACTIVE,
        },
      ]);
    });

    it('orders results by creation date descending', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([]);
      medicationRepository.createQueryBuilder.mockReturnValue(qb);

      await service.generateMedicationReport();

      expect(qb.orderBy).toHaveBeenCalledWith('medication.createdAt', 'DESC');
    });

    it('does not scope the query for an Admin caller', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([]);
      medicationRepository.createQueryBuilder.mockReturnValue(qb);

      await service.generateMedicationReport(UserRole.ADMIN, 'admin-1');

      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('scopes the query to programs assigned to the Healthcare Staff member via a subquery', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([]);
      medicationRepository.createQueryBuilder.mockReturnValue(qb);

      await service.generateMedicationReport(UserRole.HEALTHCARE_STAFF, 'staff-1');

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('programs.id IN'),
        { userId: 'staff-1' },
      );
    });
  });

  describe('generateAttendanceReport', () => {
    /**
     * Exercises the reduce/accumulation grouping logic with a fixture that
     * spans two programs and two dates, mixing Present/Late/Absent statuses,
     * so the Scheduled/Attended/Missed counters and the derived Attendance
     * Rate are verified against real arithmetic rather than an empty-array
     * short circuit. Dates are supplied as fixed ISO date-only strings
     * (no reliance on `new Date()`/wall-clock time) so the grouping key
     * (`${program}_${date}`) is fully deterministic.
     */
    it('groups attendance records by program and date, counting scheduled/attended/missed correctly', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([
        // Program A, 2024-01-01: 1 present, 1 absent -> 50% rate.
        buildAttendance({
          attendanceDate: '2024-01-01' as any,
          status: AttendanceStatus.PRESENT,
          program: { name: 'Program A' } as Program,
        }),
        buildAttendance({
          attendanceDate: '2024-01-01' as any,
          status: AttendanceStatus.ABSENT,
          program: { name: 'Program A' } as Program,
        }),
        // Program A, 2024-01-02: 1 late (counts as attended) -> 100% rate.
        buildAttendance({
          attendanceDate: '2024-01-02' as any,
          status: AttendanceStatus.LATE,
          program: { name: 'Program A' } as Program,
        }),
        // Program B, 2024-01-01: 2 absent -> 0% rate.
        buildAttendance({
          attendanceDate: '2024-01-01' as any,
          status: AttendanceStatus.ABSENT,
          program: { name: 'Program B' } as Program,
        }),
        buildAttendance({
          attendanceDate: '2024-01-01' as any,
          status: AttendanceStatus.ABSENT,
          program: { name: 'Program B' } as Program,
        }),
      ]);
      attendanceRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.generateAttendanceReport();

      expect(result).toEqual([
        {
          Date: '2024-01-01',
          Program: 'Program A',
          Scheduled: 2,
          Attended: 1,
          Missed: 1,
          'Attendance Rate': '50%',
        },
        {
          Date: '2024-01-02',
          Program: 'Program A',
          Scheduled: 1,
          Attended: 1,
          Missed: 0,
          'Attendance Rate': '100%',
        },
        {
          Date: '2024-01-01',
          Program: 'Program B',
          Scheduled: 2,
          Attended: 0,
          Missed: 2,
          'Attendance Rate': '0%',
        },
      ]);
    });

    it('does not join/scope the query for an Admin caller', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([]);
      attendanceRepository.createQueryBuilder.mockReturnValue(qb);

      await service.generateAttendanceReport(undefined, UserRole.ADMIN, 'admin-1');

      expect(qb.innerJoin).not.toHaveBeenCalled();
    });

    it('scopes the query to the assigned staff member via an enrollment inner join for Healthcare Staff', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([]);
      attendanceRepository.createQueryBuilder.mockReturnValue(qb);

      await service.generateAttendanceReport(undefined, UserRole.HEALTHCARE_STAFF, 'staff-1');

      expect(qb.innerJoin).toHaveBeenCalledWith(
        'patient_enrollments',
        'enrollment',
        'enrollment.patientId = attendance.patientId AND enrollment.programId = attendance.programId',
      );
      expect(qb.andWhere).toHaveBeenCalledWith('enrollment.assignedStaffId = :userId', {
        userId: 'staff-1',
      });
    });

    it('applies the programId and date-range filters when supplied', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([]);
      attendanceRepository.createQueryBuilder.mockReturnValue(qb);

      await service.generateAttendanceReport(
        { programId: 'program-1', startDate: '2024-01-01', endDate: '2024-01-31' },
        UserRole.ADMIN,
        'admin-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith('attendance.programId = :programId', {
        programId: 'program-1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('attendance.attendanceDate BETWEEN :startDate AND :endDate', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
    });

    it('returns an empty report when no attendance records match', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([]);
      attendanceRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(service.generateAttendanceReport()).resolves.toEqual([]);
    });
  });

  describe('generateUserReport', () => {
    it('maps users with joined assigned programs into a comma-separated column', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([
        buildUser({
          name: 'Jane Staff',
          email: 'jane@example.com',
          role: UserRole.HEALTHCARE_STAFF,
          status: UserStatus.ACTIVE,
          assignedPrograms: [{ name: 'Diabetes Care' } as Program, { name: 'Vaccination Drive' } as Program],
        }),
        // No assigned programs exercises the '' fallback.
        buildUser({ name: 'Solo Admin', role: UserRole.ADMIN, assignedPrograms: [] }),
      ]);
      userRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.generateUserReport();

      expect(result).toEqual([
        {
          Name: 'Jane Staff',
          Email: 'jane@example.com',
          Role: UserRole.HEALTHCARE_STAFF,
          'Assigned Programs': 'Diabetes Care, Vaccination Drive',
          Status: UserStatus.ACTIVE,
          Created: new Date('2024-01-01T00:00:00.000Z'),
        },
        {
          Name: 'Solo Admin',
          Email: 'jane@example.com',
          Role: UserRole.ADMIN,
          'Assigned Programs': '',
          Status: UserStatus.ACTIVE,
          Created: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]);
    });

    it('joins the assignedPrograms relation on the user query', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([]);
      userRepository.createQueryBuilder.mockReturnValue(qb);

      await service.generateUserReport();

      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('user.assignedPrograms', 'programs');
    });
  });
});
