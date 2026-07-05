import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AttendanceService } from './attendance.service';
import { Attendance, AttendanceStatus } from '../../entities/attendance.entity';
import { Program, ProgramType, ProgramStatus, SessionFrequency } from '../../entities/program.entity';
import { PatientEnrollment } from '../../entities/patient-enrollment.entity';
import { UserRole } from '../../entities/user.entity';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ActivityType } from '../../entities/activity-log.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PatientsService } from '../patients/patients.service';
import { RedisCacheService } from '../../common/cache/redis-cache.service';
import { DASHBOARD_CACHE_PREFIX } from '../dashboard/dashboard.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

/**
 * Unit coverage for `AttendanceService`, isolated from Postgres via mocked
 * repositories so it runs identically in CI and locally.
 *
 * Three behaviors get focused attention because they are easy to get subtly
 * wrong and hard to catch from "CI is green" alone:
 *
 * 1. `create()` batches attendance rows and must call
 *    `PatientsService.recomputeProgress` exactly once per distinct
 *    patient/program combination in the batch — not once per row. A naive
 *    implementation that recomputes per-row would silently multiply an
 *    expensive side effect under load.
 * 2. `update()`'s RBAC check for an unassigned Healthcare Staff user throws
 *    `NotFoundException`, not `ForbiddenException` — an information-hiding
 *    choice (don't confirm a record exists to a caller who isn't entitled to
 *    see it) that a reviewer coming from a typical REST 403 mental model
 *    could easily assume is a bug and "fix" into a behavior regression.
 * 3. `bulkUpdate()` previously took no `userRole`/assignment parameter at
 *    all, unlike `update()` — a Healthcare Staff user could bulk-mutate
 *    attendance for patients not assigned to them, bypassing the exact check
 *    `update()` enforces one record at a time. Now fixed: an optional
 *    `userRole` parameter scopes the batch to the caller's assigned patients
 *    when they're Healthcare Staff (silently skipping out-of-scope entries
 *    in the same batch rather than failing the whole request), while
 *    remaining unrestricted for Admin/omitted role — see the `bulkUpdate`
 *    describe block for both the fixed-authorization test and the
 *    backward-compatible unrestricted-when-no-role-given tests.
 */
describe('AttendanceService', () => {
  let service: AttendanceService;
  let attendanceRepository: jest.Mocked<Repository<Attendance>>;
  let programRepository: jest.Mocked<Repository<Program>>;
  let enrollmentRepository: jest.Mocked<Repository<PatientEnrollment>>;
  let activityLogsService: { create: jest.Mock };
  let notificationsService: { create: jest.Mock };
  let patientsService: { recomputeProgress: jest.Mock };
  let cache: { get: jest.Mock; set: jest.Mock; invalidateByPrefix: jest.Mock };

  const buildProgram = (overrides: Partial<Program> = {}): Program =>
    ({
      id: 'program-1',
      name: 'Diabetes Care',
      type: ProgramType.DIABETES,
      description: null,
      duration: 90,
      durationUnit: null,
      durationInDays: 90,
      totalSessions: null,
      status: ProgramStatus.ACTIVE,
      sessionFrequency: SessionFrequency.WEEKLY,
      components: null,
      medications: [],
      assignedStaff: [],
      enrollments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

  const buildEnrollment = (overrides: Partial<PatientEnrollment> = {}): PatientEnrollment =>
    ({
      id: 'enrollment-1',
      patientId: 'patient-1',
      programId: 'program-1',
      assignedStaffId: null,
      enrollmentDate: new Date(),
      endDate: null,
      completedDate: null,
      adherenceRate: null,
      attendanceRate: null,
      isCompleted: false,
      completionNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as PatientEnrollment;

  const buildAttendance = (overrides: Partial<Attendance> = {}): Attendance =>
    ({
      id: 'attendance-1',
      patientId: 'patient-1',
      programId: 'program-1',
      attendanceDate: new Date('2025-03-11'),
      status: AttendanceStatus.PRESENT,
      sessionNumber: null,
      isMissed: false,
      checkInTime: new Date('2025-03-11T09:00:00Z'),
      notes: null,
      markedById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Attendance;

  // Chainable query-builder mock: every method returns `this` except the
  // terminal `get*` call, which resolves the caller-supplied result — the
  // same pattern used by the dispensations/auth specs in this codebase.
  const buildQueryBuilder = (data: Attendance[] = [], total = 0) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(data),
    getManyAndCount: jest.fn().mockResolvedValue([data, total]),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: getRepositoryToken(Attendance),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Program),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PatientEnrollment),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: ActivityLogsService,
          useValue: { create: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: NotificationsService,
          useValue: { create: jest.fn().mockResolvedValue(undefined) },
        },
        {
          // Mocked wholesale per the task brief: PatientsService pulls in its
          // own repositories/services, none of which are relevant to
          // AttendanceService's logic, so the real class is never imported.
          provide: PatientsService,
          useValue: { recomputeProgress: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: RedisCacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn(),
            invalidateByPrefix: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(AttendanceService);
    attendanceRepository = module.get(getRepositoryToken(Attendance));
    programRepository = module.get(getRepositoryToken(Program));
    enrollmentRepository = module.get(getRepositoryToken(PatientEnrollment));
    activityLogsService = module.get(ActivityLogsService);
    notificationsService = module.get(NotificationsService);
    patientsService = module.get(PatientsService);
    cache = module.get(RedisCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('throws NotFoundException when the program does not exist, and never touches the database further', async () => {
      programRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          { programId: 'missing-program', attendanceDate: '2025-03-11', attendances: [] },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
      expect(attendanceRepository.save).not.toHaveBeenCalled();
    });

    it('backfills enrollmentId per patient from the program enrollment lookup, and calls recomputeProgress once per distinct patient/program combo — not once per row', async () => {
      programRepository.findOne.mockResolvedValue(buildProgram());

      const enrollmentPatient1 = buildEnrollment({ id: 'enrollment-p1', patientId: 'patient-1', programId: 'program-1' });
      const enrollmentPatient2 = buildEnrollment({ id: 'enrollment-p2', patientId: 'patient-2', programId: 'program-1' });
      enrollmentRepository.find.mockResolvedValue([enrollmentPatient1, enrollmentPatient2]);
      enrollmentRepository.findOne.mockImplementation(async (options: any) => {
        const { patientId, programId } = options.where;
        return (
          [enrollmentPatient1, enrollmentPatient2].find(
            (e) => e.patientId === patientId && e.programId === programId,
          ) ?? null
        );
      });

      (attendanceRepository.create as jest.Mock).mockImplementation((payload: any) => payload);
      (attendanceRepository.save as jest.Mock).mockImplementation(async (rows: any[]) =>
        rows.map((row, index) => ({ ...row, id: `attendance-${index + 1}` })),
      );

      // Four rows, only two distinct patient/program combos (patient-1 x2,
      // patient-2 x2, same programId) — this is the exact shape that would
      // expose an implementation that recomputes progress per-row instead of
      // per-combo.
      const dto: CreateAttendanceDto = {
        programId: 'program-1',
        attendanceDate: '2025-03-11',
        attendances: [
          { patientId: 'patient-1', status: AttendanceStatus.PRESENT },
          { patientId: 'patient-1', status: AttendanceStatus.LATE },
          { patientId: 'patient-2', status: AttendanceStatus.ABSENT },
          { patientId: 'patient-2', status: AttendanceStatus.PRESENT },
        ],
      };

      const result = await service.create(dto, 'user-1');

      expect(attendanceRepository.create).toHaveBeenCalledWith([
        expect.objectContaining({ patientId: 'patient-1', enrollmentId: 'enrollment-p1' }),
        expect.objectContaining({ patientId: 'patient-1', enrollmentId: 'enrollment-p1' }),
        expect.objectContaining({ patientId: 'patient-2', enrollmentId: 'enrollment-p2' }),
        expect.objectContaining({ patientId: 'patient-2', enrollmentId: 'enrollment-p2' }),
      ]);
      expect(result).toHaveLength(4);
      expect(patientsService.recomputeProgress).toHaveBeenCalledTimes(2);
      expect(patientsService.recomputeProgress).toHaveBeenCalledWith('enrollment-p1');
      expect(patientsService.recomputeProgress).toHaveBeenCalledWith('enrollment-p2');
    });

    it('sets enrollmentId to null when no enrollment exists for a patient in this program, and skips recomputeProgress for that combo', async () => {
      programRepository.findOne.mockResolvedValue(buildProgram());
      enrollmentRepository.find.mockResolvedValue([]);
      enrollmentRepository.findOne.mockResolvedValue(null);
      (attendanceRepository.create as jest.Mock).mockImplementation((payload: any) => payload);
      (attendanceRepository.save as jest.Mock).mockImplementation(async (rows: any[]) =>
        rows.map((row, index) => ({ ...row, id: `attendance-${index + 1}` })),
      );

      const dto: CreateAttendanceDto = {
        programId: 'program-1',
        attendanceDate: '2025-03-11',
        attendances: [{ patientId: 'patient-9', status: AttendanceStatus.PRESENT }],
      };

      await service.create(dto, 'user-1');

      expect(attendanceRepository.create).toHaveBeenCalledWith([
        expect.objectContaining({ patientId: 'patient-9', enrollmentId: null }),
      ]);
      expect(patientsService.recomputeProgress).not.toHaveBeenCalled();
    });

    it('invalidates the dashboard cache and writes a single activity-log entry for the whole batch, not one per row', async () => {
      programRepository.findOne.mockResolvedValue(buildProgram({ name: 'Diabetes Care' }));
      enrollmentRepository.find.mockResolvedValue([]);
      enrollmentRepository.findOne.mockResolvedValue(null);
      (attendanceRepository.create as jest.Mock).mockImplementation((payload: any) => payload);
      (attendanceRepository.save as jest.Mock).mockImplementation(async (rows: any[]) =>
        rows.map((row, index) => ({ ...row, id: `attendance-${index + 1}` })),
      );

      const dto: CreateAttendanceDto = {
        programId: 'program-1',
        attendanceDate: '2025-03-11',
        attendances: [
          { patientId: 'patient-1', status: AttendanceStatus.PRESENT },
          { patientId: 'patient-2', status: AttendanceStatus.ABSENT },
        ],
      };

      await service.create(dto, 'user-1');

      expect(cache.invalidateByPrefix).toHaveBeenCalledWith(DASHBOARD_CACHE_PREFIX);
      expect(activityLogsService.create).toHaveBeenCalledTimes(1);
      expect(activityLogsService.create).toHaveBeenCalledWith(
        ActivityType.ATTENDANCE,
        expect.stringContaining('Diabetes Care'),
        'user-1',
        expect.objectContaining({ programId: 'program-1', count: 2 }),
      );
    });

    it('does not fail the batch when the non-critical notification write throws', async () => {
      programRepository.findOne.mockResolvedValue(buildProgram());
      enrollmentRepository.find.mockResolvedValue([]);
      enrollmentRepository.findOne.mockResolvedValue(null);
      (attendanceRepository.create as jest.Mock).mockImplementation((payload: any) => payload);
      (attendanceRepository.save as jest.Mock).mockImplementation(async (rows: any[]) =>
        rows.map((row, index) => ({ ...row, id: `attendance-${index + 1}` })),
      );
      notificationsService.create.mockRejectedValue(new Error('notification service unavailable'));

      const dto: CreateAttendanceDto = {
        programId: 'program-1',
        attendanceDate: '2025-03-11',
        attendances: [{ patientId: 'patient-1', status: AttendanceStatus.PRESENT }],
      };

      await expect(service.create(dto, 'user-1')).resolves.toHaveLength(1);
    });
  });

  describe('findAll', () => {
    it('does not scope the query to any enrollment for an Admin user', async () => {
      const qb = buildQueryBuilder();
      attendanceRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.findAll(undefined, UserRole.ADMIN, 'admin-1');

      expect(qb.innerJoin).not.toHaveBeenCalled();
    });

    it('scopes the query to the assigned-staff enrollment for a Healthcare Staff user', async () => {
      const qb = buildQueryBuilder();
      attendanceRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.findAll(undefined, UserRole.HEALTHCARE_STAFF, 'staff-1');

      expect(qb.innerJoin).toHaveBeenCalledWith(
        'patient_enrollments',
        'enrollment',
        'enrollment.patientId = attendance.patientId AND enrollment.programId = attendance.programId',
      );
      expect(qb.andWhere).toHaveBeenCalledWith('enrollment.assignedStaffId = :userId', { userId: 'staff-1' });
    });

    it('applies programId, date, status, and search filters when provided', async () => {
      const qb = buildQueryBuilder();
      attendanceRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.findAll(
        { programId: 'program-1', date: '2025-03-11', status: AttendanceStatus.PRESENT, search: 'Jane' },
        UserRole.ADMIN,
        'admin-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith('attendance.programId = :programId', { programId: 'program-1' });
      expect(qb.andWhere).toHaveBeenCalledWith('DATE(attendance.attendanceDate) = :date', { date: '2025-03-11' });
      expect(qb.andWhere).toHaveBeenCalledWith('attendance.status = :status', { status: AttendanceStatus.PRESENT });
      expect(qb.andWhere).toHaveBeenCalledWith('(patient.fullName ILIKE :search OR program.name ILIKE :search)', {
        search: '%Jane%',
      });
    });

    it('defaults to page 1 / limit 50 and caps an oversized limit at 100', async () => {
      const qb = buildQueryBuilder([], 0);
      attendanceRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.findAll({ limit: 500 }, UserRole.ADMIN, 'admin-1');

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(100);
      expect(result.pagination).toEqual({ page: 1, limit: 100, total: 0, totalPages: 0 });
    });

    it('returns the requested page of records together with computed pagination metadata', async () => {
      const rows = [buildAttendance({ id: 'a-1' }), buildAttendance({ id: 'a-2' })];
      const qb = buildQueryBuilder(rows, 12);
      attendanceRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.findAll({ page: 2, limit: 5 }, UserRole.ADMIN, 'admin-1');

      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(5);
      expect(result).toEqual({
        data: rows,
        pagination: { page: 2, limit: 5, total: 12, totalPages: 3 },
      });
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the attendance record does not exist', async () => {
      attendanceRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { status: AttendanceStatus.PRESENT }, 'user-1', UserRole.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });

    // The task brief specifically flagged this as a point where intuition
    // (a REST-trained instinct toward 403 Forbidden) might be wrong. Reading
    // the source confirms it deliberately throws NotFoundException — the
    // same exception and message used for a record that doesn't exist at
    // all — so an unauthorized caller learns nothing about whether the
    // record exists.
    it('throws NotFoundException — not ForbiddenException — when a Healthcare Staff user is not assigned to the patient/program', async () => {
      const attendance = buildAttendance({ id: 'attendance-1', patientId: 'patient-1', programId: 'program-1' });
      attendanceRepository.findOne.mockResolvedValue(attendance);
      enrollmentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(attendance.id, { status: AttendanceStatus.LATE }, 'staff-2', UserRole.HEALTHCARE_STAFF),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(attendance.id, { status: AttendanceStatus.LATE }, 'staff-2', UserRole.HEALTHCARE_STAFF),
      ).rejects.toThrow('You can only update attendance for patients assigned to you');
      expect(attendanceRepository.save).not.toHaveBeenCalled();
    });

    it('allows the update when the Healthcare Staff user is assigned to the enrollment, and triggers a progress recompute', async () => {
      const attendance = buildAttendance({ id: 'attendance-1', patientId: 'patient-1', programId: 'program-1' });
      attendanceRepository.findOne.mockResolvedValue(attendance);
      (attendanceRepository.save as jest.Mock).mockImplementation(async (a: any) => a);

      const assignment = buildEnrollment({
        id: 'enrollment-1',
        patientId: 'patient-1',
        programId: 'program-1',
        assignedStaffId: 'staff-1',
      });
      enrollmentRepository.findOne.mockImplementation(async (options: any) => {
        // The assignment-check lookup includes assignedStaffId in its where
        // clause; the post-save recompute lookup does not.
        if ('assignedStaffId' in options.where) {
          return options.where.assignedStaffId === assignment.assignedStaffId ? assignment : null;
        }
        return assignment;
      });

      const dto: UpdateAttendanceDto = { status: AttendanceStatus.LATE, notes: 'Arrived late' };
      const result = await service.update(attendance.id, dto, 'staff-1', UserRole.HEALTHCARE_STAFF);

      expect(result.status).toBe(AttendanceStatus.LATE);
      expect(result.notes).toBe('Arrived late');
      expect(result.markedById).toBe('staff-1');
      expect(cache.invalidateByPrefix).toHaveBeenCalledWith(DASHBOARD_CACHE_PREFIX);
      expect(patientsService.recomputeProgress).toHaveBeenCalledWith('enrollment-1');
    });

    it('lets an Admin update any attendance record without running the assignment check at all', async () => {
      const attendance = buildAttendance({ id: 'attendance-2', patientId: 'patient-5', programId: 'program-5' });
      attendanceRepository.findOne.mockResolvedValue(attendance);
      (attendanceRepository.save as jest.Mock).mockImplementation(async (a: any) => a);
      enrollmentRepository.findOne.mockResolvedValue(
        buildEnrollment({ id: 'enrollment-5', patientId: 'patient-5', programId: 'program-5' }),
      );

      await service.update(attendance.id, { status: AttendanceStatus.EXCUSED }, 'admin-1', UserRole.ADMIN);

      // Only the unconditional post-save recompute lookup should run for an
      // Admin — the Healthcare-Staff-only assignment check is skipped
      // entirely, so there is exactly one enrollment lookup, not two.
      expect(enrollmentRepository.findOne).toHaveBeenCalledTimes(1);
      expect(enrollmentRepository.findOne).toHaveBeenCalledWith({
        where: { patientId: 'patient-5', programId: 'program-5' },
      });
    });

    it('does not call recomputeProgress when no enrollment exists for the updated record', async () => {
      const attendance = buildAttendance({ id: 'attendance-3', patientId: 'patient-9', programId: 'program-9' });
      attendanceRepository.findOne.mockResolvedValue(attendance);
      (attendanceRepository.save as jest.Mock).mockImplementation(async (a: any) => a);
      enrollmentRepository.findOne.mockResolvedValue(null);

      await service.update(attendance.id, { status: AttendanceStatus.PRESENT }, 'admin-1', UserRole.ADMIN);

      expect(patientsService.recomputeProgress).not.toHaveBeenCalled();
    });
  });

  describe('bulkUpdate', () => {
    it('applies the new status and re-stamps the actor as recorder for every matched record', async () => {
      const rows = [
        buildAttendance({ id: 'a-1', status: AttendanceStatus.ABSENT, markedById: 'user-old' }),
        buildAttendance({ id: 'a-2', status: AttendanceStatus.ABSENT, markedById: 'user-old' }),
      ];
      attendanceRepository.find.mockResolvedValue(rows);
      (attendanceRepository.save as jest.Mock).mockImplementation(async (r: any) => r);

      const result = await service.bulkUpdate(
        'program-1',
        '2025-03-11',
        [
          { id: 'a-1', status: AttendanceStatus.PRESENT },
          { id: 'a-2', status: AttendanceStatus.LATE },
        ],
        'user-1',
      );

      expect(result[0]).toMatchObject({ id: 'a-1', status: AttendanceStatus.PRESENT, markedById: 'user-1' });
      expect(result[1]).toMatchObject({ id: 'a-2', status: AttendanceStatus.LATE, markedById: 'user-1' });
      expect(cache.invalidateByPrefix).toHaveBeenCalledWith(DASHBOARD_CACHE_PREFIX);
    });

    it('scopes the record lookup to the given program and attendance date', async () => {
      attendanceRepository.find.mockResolvedValue([]);
      (attendanceRepository.save as jest.Mock).mockResolvedValue([]);

      await service.bulkUpdate('program-7', '2025-04-01', [], 'user-1');

      expect(attendanceRepository.find).toHaveBeenCalledWith({
        where: { programId: 'program-7', attendanceDate: new Date('2025-04-01') },
      });
    });

    // Failure/edge case: an update entry referencing an attendance id that
    // isn't in the fetched (programId, attendanceDate)-scoped set is silently
    // dropped rather than raising a NotFoundException — the loop's
    // `if (attendance)` guard simply skips it. This test locks in that
    // documented-by-code behavior and proves it doesn't corrupt or drop the
    // other, valid record in the same batch.
    it('silently skips an update entry whose id does not match any fetched record, without affecting other records in the batch', async () => {
      const rows = [buildAttendance({ id: 'a-1', status: AttendanceStatus.ABSENT, markedById: 'user-old' })];
      attendanceRepository.find.mockResolvedValue(rows);
      (attendanceRepository.save as jest.Mock).mockImplementation(async (r: any) => r);

      const result = await service.bulkUpdate(
        'program-1',
        '2025-03-11',
        [
          { id: 'does-not-exist', status: AttendanceStatus.PRESENT },
          { id: 'a-1', status: AttendanceStatus.PRESENT },
        ],
        'user-1',
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'a-1', status: AttendanceStatus.PRESENT, markedById: 'user-1' });
    });

    it('scopes a Healthcare Staff bulk update to only their assigned patients, skipping the rest', async () => {
      const rows = [
        buildAttendance({ id: 'a-1', patientId: 'patient-assigned', status: AttendanceStatus.ABSENT, markedById: 'user-old' }),
        buildAttendance({ id: 'a-2', patientId: 'patient-not-assigned', status: AttendanceStatus.ABSENT, markedById: 'user-old' }),
      ];
      attendanceRepository.find.mockResolvedValue(rows);
      (attendanceRepository.save as jest.Mock).mockImplementation(async (r: any) => r);
      enrollmentRepository.find.mockResolvedValue([
        { id: 'enr-1', patientId: 'patient-assigned', programId: 'program-1', assignedStaffId: 'staff-1' } as PatientEnrollment,
      ]);

      const result = await service.bulkUpdate(
        'program-1',
        '2025-03-11',
        [
          { id: 'a-1', status: AttendanceStatus.PRESENT },
          { id: 'a-2', status: AttendanceStatus.PRESENT },
        ],
        'staff-1',
        UserRole.HEALTHCARE_STAFF,
      );

      expect(enrollmentRepository.find).toHaveBeenCalledWith({
        where: { programId: 'program-1', assignedStaffId: 'staff-1' },
      });
      expect(result.find((r) => r.id === 'a-1')).toMatchObject({ status: AttendanceStatus.PRESENT, markedById: 'staff-1' });
      // Not assigned to this staff member — status and recorder must be
      // untouched, not just "not the new value".
      expect(result.find((r) => r.id === 'a-2')).toMatchObject({ status: AttendanceStatus.ABSENT, markedById: 'user-old' });
    });

    it('does not scope the batch at all for an Admin (or when no role is given)', async () => {
      const rows = [buildAttendance({ id: 'a-1', patientId: 'any-patient', status: AttendanceStatus.ABSENT, markedById: 'user-old' })];
      attendanceRepository.find.mockResolvedValue(rows);
      (attendanceRepository.save as jest.Mock).mockImplementation(async (r: any) => r);

      const result = await service.bulkUpdate(
        'program-1',
        '2025-03-11',
        [{ id: 'a-1', status: AttendanceStatus.PRESENT }],
        'admin-1',
        UserRole.ADMIN,
      );

      expect(enrollmentRepository.find).not.toHaveBeenCalled();
      expect(result[0]).toMatchObject({ status: AttendanceStatus.PRESENT, markedById: 'admin-1' });
    });
  });
});
