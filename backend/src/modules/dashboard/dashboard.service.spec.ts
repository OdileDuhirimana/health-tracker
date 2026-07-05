import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DashboardService } from './dashboard.service';
import { Program, ProgramStatus } from '../../entities/program.entity';
import { Patient, PatientStatus } from '../../entities/patient.entity';
import { Dispensation } from '../../entities/dispensation.entity';
import { Attendance, AttendanceStatus } from '../../entities/attendance.entity';
import { PatientEnrollment } from '../../entities/patient-enrollment.entity';
import { UserRole } from '../../entities/user.entity';
import { MedicationFrequency, MedicationStatus } from '../../entities/medication.entity';
import { RedisCacheService } from '../../common/cache/redis-cache.service';

/**
 * Unit coverage for `DashboardService`'s aggregate-computation logic.
 *
 * Every public method is wrapped by the private `cached()` helper, which
 * looks up `RedisCacheService` before running any query. To actually
 * exercise the query-building/aggregation logic (the thing this audit
 * cares about), `cache.get` is mocked to resolve `null` (a cache miss) in
 * every test by default — otherwise every test would just be asserting on
 * a mocked cache hit and would never touch the repository/query-builder
 * code at all. A dedicated `caching behaviour` block separately proves the
 * hit/short-circuit and miss/populate paths using `getMetrics` as a
 * representative method, since that plumbing is identical (and shared via
 * the same private helper) across every other public method.
 *
 * `createQueryBuilder` is mocked as a chainable object, matching this
 * codebase's convention (see dispensations.service.spec.ts): every
 * non-terminal method returns `this`, terminal methods
 * (`getCount`/`getMany`/`getRawMany`/`getQuery`/`getParameters`) are
 * configured per test.
 */
describe('DashboardService', () => {
  let service: DashboardService;
  let programRepository: jest.Mocked<Repository<Program>>;
  let patientRepository: jest.Mocked<Repository<Patient>>;
  let dispensationRepository: jest.Mocked<Repository<Dispensation>>;
  let attendanceRepository: jest.Mocked<Repository<Attendance>>;
  let enrollmentRepository: jest.Mocked<Repository<PatientEnrollment>>;
  let cache: { get: jest.Mock; set: jest.Mock; invalidateByPrefix: jest.Mock };

  /**
   * Builds a fresh chainable query-builder mock. Every method that TypeORM's
   * real QueryBuilder returns `this` from is wired to return the same mock
   * instance so fluent chains (`.where().andWhere().getCount()`) work
   * exactly as the service code calls them; terminal methods default to
   * unconfigured jest.fn()s that each test resolves explicitly.
   */
  const createMockQueryBuilder = (): any => {
    const qb: any = {};
    const chainMethods = [
      'select',
      'addSelect',
      'where',
      'andWhere',
      'innerJoin',
      'leftJoinAndSelect',
      'orderBy',
      'groupBy',
      'setParameters',
      'skip',
      'take',
    ];
    chainMethods.forEach((method) => {
      qb[method] = jest.fn().mockReturnValue(qb);
    });
    qb.getMany = jest.fn();
    qb.getManyAndCount = jest.fn();
    qb.getRawMany = jest.fn();
    qb.getCount = jest.fn();
    qb.getOne = jest.fn();
    qb.getQuery = jest.fn().mockReturnValue('(SELECT COUNT(enrollment.id) FROM patient_enrollments enrollment WHERE enrollment.programId = program.id)');
    qb.getParameters = jest.fn().mockReturnValue({});
    return qb;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: getRepositoryToken(Program),
          useValue: { count: jest.fn(), createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(Patient),
          useValue: { createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(Dispensation),
          useValue: { createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(Attendance),
          useValue: { createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(PatientEnrollment),
          useValue: { createQueryBuilder: jest.fn() },
        },
        {
          provide: RedisCacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            invalidateByPrefix: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(DashboardService);
    programRepository = module.get(getRepositoryToken(Program));
    patientRepository = module.get(getRepositoryToken(Patient));
    dispensationRepository = module.get(getRepositoryToken(Dispensation));
    attendanceRepository = module.get(getRepositoryToken(Attendance));
    enrollmentRepository = module.get(getRepositoryToken(PatientEnrollment));
    cache = module.get(RedisCacheService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('caching behaviour', () => {
    /**
     * Every public method delegates to the private `cached()` helper, so
     * proving the hit/miss contract once against `getMetrics` covers the
     * shared plumbing every other method relies on.
     */
    it('short-circuits the DB query entirely on a cache hit', async () => {
      const cachedValue = { totalPrograms: 99, activePatients: 1, pendingMedications: 0, overdueSessions: 0 };
      cache.get.mockResolvedValue(cachedValue);

      const result = await service.getMetrics(UserRole.ADMIN, 'user-1');

      expect(result).toEqual(cachedValue);
      expect(programRepository.count).not.toHaveBeenCalled();
      expect(patientRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('computes and populates the cache on a miss, keyed by role and userId', async () => {
      cache.get.mockResolvedValue(null);
      programRepository.count.mockResolvedValue(3);
      const qb = createMockQueryBuilder();
      qb.getCount.mockResolvedValue(7);
      patientRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getMetrics(UserRole.ADMIN, 'user-1');

      expect(result).toEqual({ totalPrograms: 3, activePatients: 7, pendingMedications: 0, overdueSessions: 0 });
      expect(cache.get).toHaveBeenCalledWith('dashboard:metrics:Admin:user-1');
      expect(cache.set).toHaveBeenCalledWith('dashboard:metrics:Admin:user-1', result, 60);
    });

    it('falls back to "none" placeholders in the cache key when role/userId are undefined', async () => {
      cache.get.mockResolvedValue(null);
      programRepository.count.mockResolvedValue(0);
      const qb = createMockQueryBuilder();
      qb.getCount.mockResolvedValue(0);
      patientRepository.createQueryBuilder.mockReturnValue(qb);

      await service.getMetrics();

      expect(cache.get).toHaveBeenCalledWith('dashboard:metrics:none:none');
    });
  });

  describe('getMetrics', () => {
    it('counts active programs and active patients without role scoping for an Admin caller', async () => {
      programRepository.count.mockResolvedValue(5);
      const qb = createMockQueryBuilder();
      qb.getCount.mockResolvedValue(42);
      patientRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getMetrics(UserRole.ADMIN, 'admin-1');

      expect(programRepository.count).toHaveBeenCalledWith({ where: { status: ProgramStatus.ACTIVE } });
      expect(qb.where).toHaveBeenCalledWith('patient.status = :status', { status: PatientStatus.ACTIVE });
      expect(qb.innerJoin).not.toHaveBeenCalled();
      expect(result).toEqual({ totalPrograms: 5, activePatients: 42, pendingMedications: 0, overdueSessions: 0 });
    });

    it('scopes the active-patients count to the caller\'s assigned enrollments for Healthcare Staff', async () => {
      programRepository.count.mockResolvedValue(2);
      const qb = createMockQueryBuilder();
      qb.getCount.mockResolvedValue(9);
      patientRepository.createQueryBuilder.mockReturnValue(qb);

      await service.getMetrics(UserRole.HEALTHCARE_STAFF, 'staff-1');

      expect(qb.innerJoin).toHaveBeenCalledWith('patient.enrollments', 'enrollment');
      expect(qb.andWhere).toHaveBeenCalledWith('enrollment.assignedStaffId = :userId', { userId: 'staff-1' });
    });

    it('does not apply staff scoping when role is Healthcare Staff but no userId is supplied', async () => {
      programRepository.count.mockResolvedValue(1);
      const qb = createMockQueryBuilder();
      qb.getCount.mockResolvedValue(1);
      patientRepository.createQueryBuilder.mockReturnValue(qb);

      await service.getMetrics(UserRole.HEALTHCARE_STAFF, undefined);

      expect(qb.innerJoin).not.toHaveBeenCalled();
    });

    it('always reports pendingMedications as 0 and overdueSessions as 0 (both features are stubbed out)', async () => {
      programRepository.count.mockResolvedValue(0);
      const qb = createMockQueryBuilder();
      qb.getCount.mockResolvedValue(0);
      patientRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getMetrics(UserRole.ADMIN, 'admin-1');

      expect(result.pendingMedications).toBe(0);
      expect(result.overdueSessions).toBe(0);
    });
  });

  describe('getPendingMedicationsCount', () => {
    it('always returns 0 regardless of caller role (feature not yet implemented)', async () => {
      await expect(service.getPendingMedicationsCount(UserRole.ADMIN, 'admin-1')).resolves.toBe(0);
      await expect(service.getPendingMedicationsCount()).resolves.toBe(0);
    });
  });

  describe('getProgramsOverview', () => {
    it('maps raw rows to the { name, patients } shape, preferring the aliased program_name field', async () => {
      const programQb = createMockQueryBuilder();
      const subQb = createMockQueryBuilder();
      programQb.getRawMany.mockResolvedValue([
        { program_name: 'Diabetes Care', totalPatients: '12' },
        { name: 'Fallback Name', totalPatients: undefined },
      ]);
      programRepository.createQueryBuilder.mockReturnValue(programQb);
      enrollmentRepository.createQueryBuilder.mockReturnValue(subQb);

      const result = await service.getProgramsOverview(UserRole.ADMIN, 'admin-1');

      expect(result).toEqual([
        { name: 'Diabetes Care', patients: 12 },
        { name: 'Fallback Name', patients: 0 },
      ]);
    });

    it('does not apply role scoping for an Admin caller', async () => {
      const programQb = createMockQueryBuilder();
      const subQb = createMockQueryBuilder();
      programQb.getRawMany.mockResolvedValue([]);
      programRepository.createQueryBuilder.mockReturnValue(programQb);
      enrollmentRepository.createQueryBuilder.mockReturnValue(subQb);

      await service.getProgramsOverview(UserRole.ADMIN, 'admin-1');

      // Only the base ACTIVE-status predicate should be applied — no
      // additional andWhere for role scoping.
      expect(programQb.andWhere).not.toHaveBeenCalled();
      expect(subQb.andWhere).not.toHaveBeenCalled();
    });

    it('scopes both the outer program query and the patient-count subquery to the assigned staff member for Healthcare Staff', async () => {
      const programQb = createMockQueryBuilder();
      const subQb = createMockQueryBuilder();
      programQb.getRawMany.mockResolvedValue([]);
      programRepository.createQueryBuilder.mockReturnValue(programQb);
      enrollmentRepository.createQueryBuilder.mockReturnValue(subQb);

      await service.getProgramsOverview(UserRole.HEALTHCARE_STAFF, 'staff-7');

      expect(programQb.andWhere).toHaveBeenCalledWith(
        'program.id IN (SELECT DISTINCT enrollment.programId FROM patient_enrollments enrollment WHERE enrollment.assignedStaffId = :userId)',
        { userId: 'staff-7' },
      );
      expect(subQb.andWhere).toHaveBeenCalledWith('enrollment.assignedStaffId = :userId', { userId: 'staff-7' });
    });

    it('composes the correlated subquery via addSelect/setParameters using the subquery builder\'s getQuery/getParameters', async () => {
      const programQb = createMockQueryBuilder();
      const subQb = createMockQueryBuilder();
      subQb.getQuery.mockReturnValue('(SELECT COUNT(enrollment.id) FROM patient_enrollments enrollment WHERE enrollment.programId = program.id)');
      subQb.getParameters.mockReturnValue({ userId: 'staff-7' });
      programQb.getRawMany.mockResolvedValue([]);
      programRepository.createQueryBuilder.mockReturnValue(programQb);
      enrollmentRepository.createQueryBuilder.mockReturnValue(subQb);

      await service.getProgramsOverview(UserRole.HEALTHCARE_STAFF, 'staff-7');

      expect(programQb.addSelect).toHaveBeenCalledWith(
        `(${subQb.getQuery()})`,
        'totalPatients',
      );
      expect(programQb.setParameters).toHaveBeenCalledWith({ userId: 'staff-7' });
    });
  });

  describe('getAttendanceData', () => {
    it('computes present and absent counts from two independently-scoped queries', async () => {
      const presentQb = createMockQueryBuilder();
      const absentQb = createMockQueryBuilder();
      presentQb.getCount.mockResolvedValue(18);
      absentQb.getCount.mockResolvedValue(4);
      attendanceRepository.createQueryBuilder
        .mockReturnValueOnce(presentQb)
        .mockReturnValueOnce(absentQb);

      const result = await service.getAttendanceData(UserRole.ADMIN, 'admin-1');

      expect(presentQb.andWhere).toHaveBeenCalledWith('attendance.status = :status', { status: AttendanceStatus.PRESENT });
      expect(absentQb.andWhere).toHaveBeenCalledWith('attendance.status = :status', { status: AttendanceStatus.ABSENT });
      expect(result).toEqual({ present: 18, pending: 0, absent: 4 });
    });

    it('joins both the present and absent queries to the caller\'s enrollments for Healthcare Staff', async () => {
      const presentQb = createMockQueryBuilder();
      const absentQb = createMockQueryBuilder();
      presentQb.getCount.mockResolvedValue(1);
      absentQb.getCount.mockResolvedValue(1);
      attendanceRepository.createQueryBuilder
        .mockReturnValueOnce(presentQb)
        .mockReturnValueOnce(absentQb);

      await service.getAttendanceData(UserRole.HEALTHCARE_STAFF, 'staff-3');

      expect(presentQb.innerJoin).toHaveBeenCalledWith(
        'patient_enrollments',
        'enrollment',
        'enrollment.patientId = attendance.patientId AND enrollment.programId = attendance.programId',
      );
      expect(presentQb.andWhere).toHaveBeenCalledWith('enrollment.assignedStaffId = :userId', { userId: 'staff-3' });
      expect(absentQb.innerJoin).toHaveBeenCalled();
      expect(absentQb.andWhere).toHaveBeenCalledWith('enrollment.assignedStaffId = :userId', { userId: 'staff-3' });
    });

    it('does not join for an Admin caller', async () => {
      const presentQb = createMockQueryBuilder();
      const absentQb = createMockQueryBuilder();
      presentQb.getCount.mockResolvedValue(0);
      absentQb.getCount.mockResolvedValue(0);
      attendanceRepository.createQueryBuilder
        .mockReturnValueOnce(presentQb)
        .mockReturnValueOnce(absentQb);

      await service.getAttendanceData(UserRole.ADMIN, 'admin-1');

      expect(presentQb.innerJoin).not.toHaveBeenCalled();
      expect(absentQb.innerJoin).not.toHaveBeenCalled();
    });
  });

  describe('getAdherenceRate', () => {
    /**
     * The service reads `new Date()` internally to establish "now" and the
     * 7-day window. Fake timers pin the system clock so the "last 7 days"
     * window is fully deterministic — otherwise this test would flake
     * depending on the real wall-clock date it happens to run on, which is
     * exactly the class of bug this audit is trying to eliminate.
     *
     * NOTE: the source's `days` array is a fixed, generic
     * `['Mon','Tue',...,'Sun']` label list applied to "today minus (6..0)"
     * regardless of what the real weekday of each date is — see the "real
     * bug" flagged in the final report. These tests assert the *actual*
     * current behaviour (labels always run Mon..Sun in that fixed order for
     * the oldest..newest day in the window), not a corrected version.
     */
    const FIXED_NOW = new Date('2024-03-10T12:00:00.000Z'); // a Sunday in UTC

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(FIXED_NOW);
    });

    it('buckets dispensation counts into the correct fixed weekday label and clamps the rate to [0, 100]', async () => {
      const qb = createMockQueryBuilder();
      // Oldest day in the window ('Mon' bucket) is 6 days before FIXED_NOW.
      const oldestDay = '2024-03-04';
      // Newest day in the window ('Sun' bucket) is FIXED_NOW's own date.
      const newestDay = '2024-03-10';
      qb.getRawMany.mockResolvedValue([
        { date: oldestDay, count: '5' }, // 5/10 * 100 = 50
        { date: newestDay, count: '25' }, // 25/10 * 100 = 250, clamped to 100
      ]);
      dispensationRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getAdherenceRate(UserRole.ADMIN, 'admin-1');

      expect(result.data).toHaveLength(7);
      expect(result.data[0]).toEqual({ name: 'Mon', rate: 50 });
      expect(result.data[6]).toEqual({ name: 'Sun', rate: 100 });
      // Days with no matching dispensation row default to a 0% rate.
      expect(result.data[3]).toEqual({ name: 'Thu', rate: 0 });
    });

    it('queries the 7-day window bounded by the fixed "now"', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawMany.mockResolvedValue([]);
      dispensationRepository.createQueryBuilder.mockReturnValue(qb);

      await service.getAdherenceRate(UserRole.ADMIN, 'admin-1');

      const sevenDaysAgo = new Date(FIXED_NOW);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      expect(qb.where).toHaveBeenCalledWith('dispensation.dispensedAt >= :sevenDaysAgo', { sevenDaysAgo });
      expect(qb.andWhere).toHaveBeenCalledWith('dispensation.dispensedAt <= :now', { now: FIXED_NOW });
    });

    it('scopes the query to the caller\'s enrollments for Healthcare Staff', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawMany.mockResolvedValue([]);
      dispensationRepository.createQueryBuilder.mockReturnValue(qb);

      await service.getAdherenceRate(UserRole.HEALTHCARE_STAFF, 'staff-9');

      expect(qb.innerJoin).toHaveBeenCalledWith(
        'patient_enrollments',
        'enrollment',
        'enrollment.patientId = dispensation.patientId AND enrollment.programId = dispensation.programId',
      );
      expect(qb.andWhere).toHaveBeenCalledWith('enrollment.assignedStaffId = :userId', { userId: 'staff-9' });
    });
  });

  describe('getUpcomingDispensations', () => {
    const FIXED_NOW = new Date('2024-03-10T12:00:00.000Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(FIXED_NOW);
    });

    const buildDispensation = (overrides: Record<string, any> = {}) => ({
      patientId: 'patient-1',
      medicationId: 'med-1',
      programId: 'program-1',
      dispensedAt: new Date('2024-03-09T08:00:00.000Z'),
      patient: { fullName: 'Jane Roe' },
      medication: { name: 'Amoxicillin', frequency: MedicationFrequency.DAILY },
      program: { name: 'Diabetes Care' },
      ...overrides,
    });

    it('keeps only the most recent dispensation per patient+medication+program when duplicates exist', async () => {
      const qb = createMockQueryBuilder();
      // The real query orders by dispensedAt DESC, so the mocked getMany()
      // result must already reflect that ordering — the newest record for
      // the (patient, medication, program) key comes first.
      qb.getMany.mockResolvedValue([
        buildDispensation({ dispensedAt: new Date('2024-03-09T08:00:00.000Z'), notes: 'newest' }),
        buildDispensation({ dispensedAt: new Date('2024-01-01T08:00:00.000Z'), notes: 'oldest' }),
      ]);
      dispensationRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getUpcomingDispensations(UserRole.ADMIN, 'admin-1');

      // Only one entry should surface for the deduplicated key. Its
      // next-due date must be computed from the newest dispensedAt
      // (2024-03-09 + 1 day = 2024-03-10T08:00Z, before FIXED_NOW's
      // 12:00Z -> overdue), never from the older, discarded record
      // (which would compute a next-due date of 2024-01-02, also
      // overdue, but with a different — wrong — nextDueDate).
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ patientId: 'patient-1', medicationId: 'med-1', programId: 'program-1', status: 'overdue' });
      expect(result[0].nextDueDate).toBe(new Date('2024-03-10T08:00:00.000Z').toISOString());
    });

    it('classifies a dispensation whose next-due date has already passed as overdue', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([
        buildDispensation({ dispensedAt: new Date('2024-03-05T08:00:00.000Z') }), // +1 day = 2024-03-06, well before FIXED_NOW
      ]);
      dispensationRepository.createQueryBuilder.mockReturnValue(qb);

      const [result] = await service.getUpcomingDispensations(UserRole.ADMIN, 'admin-1');

      expect(result.status).toBe('overdue');
      expect(result.nextDueDate).toBe(new Date('2024-03-06T08:00:00.000Z').toISOString());
    });

    it('classifies a dispensation due later today (but not yet past) as due_today', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([
        // +1 day = 2024-03-10T08:00:00Z, which is before FIXED_NOW
        // (12:00:00Z) — to get a "due later today" case we need the next
        // due timestamp to land after "now" but still on today's date.
        buildDispensation({ dispensedAt: new Date('2024-03-09T18:00:00.000Z') }), // +1 day = 2024-03-10T18:00:00Z
      ]);
      dispensationRepository.createQueryBuilder.mockReturnValue(qb);

      const [result] = await service.getUpcomingDispensations(UserRole.ADMIN, 'admin-1');

      expect(result.status).toBe('due_today');
    });

    it('excludes a dispensation whose next-due date falls after the end of today', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([
        buildDispensation({ dispensedAt: new Date('2024-03-10T08:00:00.000Z') }), // +1 day = 2024-03-11, beyond end of today
      ]);
      dispensationRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getUpcomingDispensations(UserRole.ADMIN, 'admin-1');

      expect(result).toHaveLength(0);
    });

    it('defaults to Daily frequency and "Unknown" relation names when the medication/patient/program relations are missing', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([
        buildDispensation({
          dispensedAt: new Date('2024-03-05T08:00:00.000Z'),
          patient: undefined,
          medication: undefined,
          program: undefined,
        }),
      ]);
      dispensationRepository.createQueryBuilder.mockReturnValue(qb);

      const [result] = await service.getUpcomingDispensations(UserRole.ADMIN, 'admin-1');

      expect(result.patientName).toBe('Unknown');
      expect(result.medicationName).toBe('Unknown');
      expect(result.programName).toBe('Unknown');
      // Falls back to Daily (+1 day): 2024-03-05 + 1 = 2024-03-06 -> overdue.
      expect(result.status).toBe('overdue');
    });

    it('sorts overdue entries before due_today entries, then by soonest next-due date within each group', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([
        buildDispensation({
          patientId: 'patient-a',
          dispensedAt: new Date('2024-03-09T18:00:00.000Z'), // due_today, later
        }),
        buildDispensation({
          patientId: 'patient-b',
          dispensedAt: new Date('2024-03-01T08:00:00.000Z'), // overdue, earlier due date
        }),
        buildDispensation({
          patientId: 'patient-c',
          dispensedAt: new Date('2024-03-05T08:00:00.000Z'), // overdue, later due date than patient-b
        }),
      ]);
      dispensationRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getUpcomingDispensations(UserRole.ADMIN, 'admin-1');

      expect(result.map((r) => r.patientId)).toEqual(['patient-b', 'patient-c', 'patient-a']);
      expect(result.map((r) => r.status)).toEqual(['overdue', 'overdue', 'due_today']);
    });

    it('scopes the query to active patients, active medications, and the caller\'s enrollments for Healthcare Staff', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      dispensationRepository.createQueryBuilder.mockReturnValue(qb);

      await service.getUpcomingDispensations(UserRole.HEALTHCARE_STAFF, 'staff-4');

      expect(qb.where).toHaveBeenCalledWith('patient.status = :status', { status: PatientStatus.ACTIVE });
      expect(qb.andWhere).toHaveBeenCalledWith('medication.status = :medStatus', { medStatus: MedicationStatus.ACTIVE });
      expect(qb.innerJoin).toHaveBeenCalledWith(
        'patient_enrollments',
        'enrollment',
        'enrollment.patientId = dispensation.patientId AND enrollment.programId = dispensation.programId',
      );
      expect(qb.andWhere).toHaveBeenCalledWith('enrollment.assignedStaffId = :userId', { userId: 'staff-4' });
    });
  });

  describe('getProgramDurationSummary', () => {
    it('computes adherencePercent from dispensation count vs. expected count and excludes programs with no active enrollments', async () => {
      const programQb = createMockQueryBuilder();
      const activeProgram = {
        id: 'program-1',
        name: 'Diabetes Care',
        enrollments: [
          { enrollmentDate: '2024-01-01', completedDate: null, isCompleted: false },
        ],
      };
      const emptyProgram = {
        id: 'program-2',
        name: 'Vaccination Drive',
        enrollments: [
          { enrollmentDate: '2024-01-01', completedDate: '2024-01-15', isCompleted: true },
        ],
      };
      programQb.getMany.mockResolvedValue([activeProgram, emptyProgram]);
      programRepository.createQueryBuilder.mockReturnValue(programQb);

      const dispensationQb = createMockQueryBuilder();
      dispensationQb.getCount.mockResolvedValue(15); // 15 / (1 active enrollment * 30) = 50%
      dispensationRepository.createQueryBuilder.mockReturnValue(dispensationQb);

      const result = await service.getProgramDurationSummary(UserRole.ADMIN, 'admin-1');

      // emptyProgram has 0 active (non-completed) enrollments and is
      // filtered out entirely by `summary.filter(s => s.activePatients > 0)`.
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        programName: 'Diabetes Care',
        activePatients: 1,
        adherencePercent: 50,
      });
    });

    it('scopes the enrollment join and dispensation count to the caller\'s caseload for Healthcare Staff', async () => {
      const programQb = createMockQueryBuilder();
      programQb.getMany.mockResolvedValue([]);
      programRepository.createQueryBuilder.mockReturnValue(programQb);

      await service.getProgramDurationSummary(UserRole.HEALTHCARE_STAFF, 'staff-5');

      expect(programQb.leftJoinAndSelect).toHaveBeenCalledWith('program.enrollments', 'enrollment');
      expect(programQb.andWhere).toHaveBeenCalledWith('enrollment.assignedStaffId = :userId', { userId: 'staff-5' });
    });
  });
});
