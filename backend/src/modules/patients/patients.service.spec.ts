import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { PatientsService } from './patients.service';
import { Patient, PatientStatus, Gender } from '../../entities/patient.entity';
import { PatientEnrollment } from '../../entities/patient-enrollment.entity';
import { Program, SessionFrequency } from '../../entities/program.entity';
import { User, UserRole } from '../../entities/user.entity';
import { Attendance, AttendanceStatus } from '../../entities/attendance.entity';
import { Dispensation } from '../../entities/dispensation.entity';
import { MedicationFrequency } from '../../entities/medication.entity';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RedisCacheService } from '../../common/cache/redis-cache.service';

/**
 * Unit coverage for `PatientsService` — flagged by the hiring-committee
 * audit as the highest-risk untested module: it owns the only multi-step DB
 * transaction in the codebase (`enroll`) and the role-filtered query paths
 * that decide which patients a Healthcare Staff account is even allowed to
 * see or edit. Every repository, the DataSource/queryRunner, and the two
 * cross-cutting services (activity logs, notifications) are mocked so these
 * tests exercise only `PatientsService`'s own branching logic, never a real
 * database or transaction.
 */
describe('PatientsService', () => {
  let service: PatientsService;
  let patientRepository: jest.Mocked<Repository<Patient>>;
  let enrollmentRepository: jest.Mocked<Repository<PatientEnrollment>>;
  let programRepository: jest.Mocked<Repository<Program>>;
  let attendanceRepository: jest.Mocked<Repository<Attendance>>;
  let dispensationRepository: jest.Mocked<Repository<Dispensation>>;
  let dataSource: { createQueryRunner: jest.Mock };
  let activityLogsService: { create: jest.Mock };
  let notificationsService: { create: jest.Mock };
  let cacheService: { invalidateByPrefix: jest.Mock };

  // Chainable QueryBuilder stub: every builder method returns `this` except
  // the terminal `get*` calls, which resolve to whatever the test configures.
  const createQueryBuilderMock = () => {
    const qb: any = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
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
      fullName: 'John Doe',
      dateOfBirth: new Date('1990-01-01'),
      gender: Gender.MALE,
      status: PatientStatus.ACTIVE,
      patientId: 'P-1001',
      enrollments: [],
      ...overrides,
    }) as Patient;

  const buildProgram = (overrides: Partial<Program> = {}): Program =>
    ({
      id: 'program-1',
      name: 'Diabetes Care',
      sessionFrequency: SessionFrequency.WEEKLY,
      assignedStaff: [],
      ...overrides,
    }) as Program;

  let mockQueryRunner: any;

  beforeEach(async () => {
    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockImplementation(async () => {
        mockQueryRunner.isTransactionActive = true;
      }),
      commitTransaction: jest.fn().mockImplementation(async () => {
        mockQueryRunner.isTransactionActive = false;
      }),
      rollbackTransaction: jest.fn().mockImplementation(async () => {
        mockQueryRunner.isTransactionActive = false;
      }),
      release: jest.fn().mockResolvedValue(undefined),
      isTransactionActive: false,
      manager: {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        {
          provide: getRepositoryToken(Patient),
          useValue: {
            createQueryBuilder: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PatientEnrollment),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Program),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Attendance),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(Dispensation),
          useValue: { find: jest.fn(), count: jest.fn() },
        },
        {
          provide: getDataSourceToken(),
          useValue: { createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner) },
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
          provide: RedisCacheService,
          useValue: { invalidateByPrefix: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(PatientsService);
    patientRepository = module.get(getRepositoryToken(Patient));
    enrollmentRepository = module.get(getRepositoryToken(PatientEnrollment));
    programRepository = module.get(getRepositoryToken(Program));
    attendanceRepository = module.get(getRepositoryToken(Attendance));
    dispensationRepository = module.get(getRepositoryToken(Dispensation));
    dataSource = module.get(getDataSourceToken());
    activityLogsService = module.get(ActivityLogsService);
    notificationsService = module.get(NotificationsService);
    cacheService = module.get(RedisCacheService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generatePatientId', () => {
    it('starts the sequence at P-1001 when no patient exists yet', async () => {
      const qb = createQueryBuilderMock();
      qb.getOne.mockResolvedValue(null);
      patientRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(service.generatePatientId()).resolves.toBe('P-1001');
    });

    it('increments the numeric suffix of the last generated patient ID', async () => {
      const qb = createQueryBuilderMock();
      qb.getOne.mockResolvedValue(buildPatient({ patientId: 'P-1042' }));
      patientRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(service.generatePatientId()).resolves.toBe('P-1043');
    });
  });

  describe('create', () => {
    it('generates a patient ID, persists the patient, and logs the activity', async () => {
      const qb = createQueryBuilderMock();
      qb.getOne.mockResolvedValue(null);
      patientRepository.createQueryBuilder.mockReturnValue(qb);
      patientRepository.create.mockImplementation((data) => data as Patient);
      const saved = buildPatient({ patientId: 'P-1001' });
      patientRepository.save.mockResolvedValue(saved);

      const result = await service.create({ fullName: 'John Doe' } as any, 'user-1');

      expect(patientRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ patientId: 'P-1001' }),
      );
      expect(activityLogsService.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('John Doe'),
        'user-1',
        expect.objectContaining({ patientId: saved.id }),
      );
      expect(result).toBe(saved);
    });
  });

  describe('findAll', () => {
    it('returns all patients with no pre-filter subquery for an Admin', async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[buildPatient()], 1]);
      patientRepository.createQueryBuilder.mockReturnValue(qb);
      jest.spyOn(service, 'calculatePatientProgress').mockResolvedValue({
        attendanceRate: 0,
        adherenceRate: 0,
        sessionsCompleted: 0,
        sessionsMissed: 0,
        sessionsExpected: 0,
        medicationsDispensed: 0,
        medicationsExpected: 0,
        hasMissedSessions: false,
      });

      const result = await service.findAll({}, UserRole.ADMIN, 'admin-1');

      expect(patientRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(qb.getManyAndCount).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.pagination).toEqual({ page: 1, limit: 50, total: 1, totalPages: 1 });
    });

    it('applies search, programId, and status filters on the Admin query path', async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      patientRepository.createQueryBuilder.mockReturnValue(qb);
      jest.spyOn(service, 'calculatePatientProgress').mockResolvedValue({} as any);

      await service.findAll(
        { search: 'jane', programId: 'program-1', status: 'Active' },
        UserRole.ADMIN,
        'admin-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%jane%' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('program.id = :programId', { programId: 'program-1' });
      expect(qb.andWhere).toHaveBeenCalledWith('patient.status = :status', { status: 'Active' });
    });

    it('scopes results to assigned patients via a subquery for Healthcare Staff', async () => {
      const subQb = createQueryBuilderMock();
      subQb.getRawMany.mockResolvedValue([{ id: 'patient-1' }, { id: 'patient-2' }]);
      const mainQb = createQueryBuilderMock();
      mainQb.getMany.mockResolvedValue([buildPatient({ id: 'patient-1' }), buildPatient({ id: 'patient-2' })]);
      patientRepository.createQueryBuilder
        .mockReturnValueOnce(subQb)
        .mockReturnValueOnce(mainQb);
      jest.spyOn(service, 'calculatePatientProgress').mockResolvedValue({} as any);

      const result = await service.findAll({}, UserRole.HEALTHCARE_STAFF, 'staff-1');

      expect(subQb.innerJoin).toHaveBeenCalledWith(
        'patient.enrollments',
        'enrollments',
        'enrollments.assignedStaffId = :userId',
        { userId: 'staff-1' },
      );
      expect(mainQb.andWhere).toHaveBeenCalledWith('patient.id IN (:...patientIds)', {
        patientIds: ['patient-1', 'patient-2'],
      });
      expect(mainQb.getMany).toHaveBeenCalled();
      expect(mainQb.getManyAndCount).not.toHaveBeenCalled();
      expect(result.pagination.total).toBe(2);
      expect(result.data).toHaveLength(2);
    });

    it('short-circuits with an empty page for Healthcare Staff assigned to no patients', async () => {
      const subQb = createQueryBuilderMock();
      subQb.getRawMany.mockResolvedValue([]);
      patientRepository.createQueryBuilder.mockReturnValue(subQb);

      const result = await service.findAll({}, UserRole.HEALTHCARE_STAFF, 'staff-1');

      expect(result).toEqual({
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      });
      // The main patient query builder must never be constructed once the
      // subquery already proved there is nothing to fetch.
      expect(patientRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    });
  });

  describe('calculatePatientProgress', () => {
    it('returns all-zero progress when the patient has no enrollments', async () => {
      enrollmentRepository.find.mockResolvedValue([]);

      const result = await service.calculatePatientProgress('patient-1');

      expect(result).toEqual({
        attendanceRate: 0,
        adherenceRate: 0,
        sessionsCompleted: 0,
        sessionsMissed: 0,
        sessionsExpected: 0,
        medicationsDispensed: 0,
        medicationsExpected: 0,
        hasMissedSessions: false,
      });
    });

    it('computes non-zero attendance and adherence rates from mocked enrollment/attendance/dispensation data', async () => {
      // Both dates are fixed (the enrollment is already completed with an
      // explicit endDate) so the expected-occurrence math is fully
      // deterministic — it never falls through to the service's internal
      // `new Date()` ("now"), which would make the exact day count depend on
      // wall-clock timing between fixture setup and service execution.
      const enrollmentDate = new Date('2024-01-01T00:00:00.000Z');
      const endDate = new Date('2024-01-22T00:00:00.000Z'); // exactly 21 days later

      enrollmentRepository.find.mockResolvedValue([
        {
          id: 'enrollment-1',
          patientId: 'patient-1',
          programId: 'program-1',
          enrollmentDate,
          isCompleted: true,
          endDate,
          program: { sessionFrequency: SessionFrequency.WEEKLY },
        } as any,
      ]);

      // 21 days at WEEKLY frequency => ceil(21/7) = 3 expected sessions.
      attendanceRepository.find.mockResolvedValue([
        { status: AttendanceStatus.PRESENT },
        { status: AttendanceStatus.LATE },
        { status: AttendanceStatus.ABSENT },
      ] as Attendance[]);

      programRepository.findOne.mockResolvedValue({
        id: 'program-1',
        medications: [{ frequency: MedicationFrequency.DAILY }],
      } as any);

      // 21 days at DAILY frequency => 21 expected medications.
      dispensationRepository.find.mockResolvedValue(
        new Array(5).fill({ patientId: 'patient-1' }) as Dispensation[],
      );

      const result = await service.calculatePatientProgress('patient-1');

      expect(result.sessionsExpected).toBe(3);
      expect(result.sessionsCompleted).toBe(2); // PRESENT + LATE
      expect(result.sessionsMissed).toBe(1);
      expect(result.attendanceRate).toBe(67); // round(2/3 * 100)
      expect(result.medicationsExpected).toBe(21);
      expect(result.medicationsDispensed).toBe(5);
      expect(result.adherenceRate).toBe(24); // round(5/21 * 100)
      expect(result.hasMissedSessions).toBe(true);
    });
  });

  describe('findOne', () => {
    it('returns the patient when found', async () => {
      const qb = createQueryBuilderMock();
      qb.getOne.mockResolvedValue(buildPatient());
      patientRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(service.findOne('patient-1')).resolves.toEqual(buildPatient());
    });

    it('scopes the lookup to assigned enrollments for Healthcare Staff', async () => {
      const qb = createQueryBuilderMock();
      qb.getOne.mockResolvedValue(buildPatient());
      patientRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findOne('patient-1', UserRole.HEALTHCARE_STAFF, 'staff-1');

      expect(qb.andWhere).toHaveBeenCalledWith('enrollments.assignedStaffId = :userId', { userId: 'staff-1' });
    });

    it('throws NotFoundException when no patient matches (including access-scoped misses)', async () => {
      const qb = createQueryBuilderMock();
      qb.getOne.mockResolvedValue(null);
      patientRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(service.findOne('missing-patient')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the patient does not exist', async () => {
      patientRepository.findOne.mockResolvedValue(null);

      await expect(service.update('missing', {} as any, 'user-1', UserRole.ADMIN)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('allows an Admin to edit any patient regardless of assignment', async () => {
      const patient = buildPatient({ enrollments: [{ assignedStaffId: 'someone-else' } as any] });
      patientRepository.findOne.mockResolvedValue(patient);
      patientRepository.save.mockImplementation(async (p) => p as Patient);

      const result = await service.update('patient-1', { fullName: 'Updated Name' }, 'admin-1', UserRole.ADMIN);

      expect(result.fullName).toBe('Updated Name');
      expect(activityLogsService.create).toHaveBeenCalled();
    });

    it('throws ForbiddenException when Healthcare Staff is not assigned to the patient', async () => {
      const patient = buildPatient({ enrollments: [{ assignedStaffId: 'other-staff' } as any] });
      patientRepository.findOne.mockResolvedValue(patient);

      await expect(
        service.update('patient-1', { fullName: 'X' } as any, 'staff-1', UserRole.HEALTHCARE_STAFF),
      ).rejects.toThrow(ForbiddenException);
      expect(patientRepository.save).not.toHaveBeenCalled();
    });

    it('allows Healthcare Staff to edit a patient they are assigned to', async () => {
      const patient = buildPatient({ enrollments: [{ assignedStaffId: 'staff-1' } as any] });
      patientRepository.findOne.mockResolvedValue(patient);
      patientRepository.save.mockImplementation(async (p) => p as Patient);

      const result = await service.update(
        'patient-1',
        { fullName: 'Updated Name' },
        'staff-1',
        UserRole.HEALTHCARE_STAFF,
      );

      expect(result.fullName).toBe('Updated Name');
    });
  });

  describe('enroll', () => {
    const dto = { patientId: 'patient-1', programId: 'program-1' };

    const mockFindOneByEntity = (patient: any, program: any, existingEnrollment: any = null) => {
      mockQueryRunner.manager.findOne.mockImplementation((entity: any) => {
        if (entity === Patient) return Promise.resolve(patient);
        if (entity === Program) return Promise.resolve(program);
        if (entity === PatientEnrollment) return Promise.resolve(existingEnrollment);
        return Promise.resolve(null);
      });
    };

    it('commits the transaction and returns the enrolled patient on success', async () => {
      const patient = buildPatient();
      const program = buildProgram({ assignedStaff: [] });
      mockFindOneByEntity(patient, program, null);
      mockQueryRunner.manager.create.mockImplementation((_entity: any, data: any) => data);
      mockQueryRunner.manager.save.mockResolvedValue(undefined);
      const finalPatient = buildPatient();
      jest.spyOn(service, 'findOne').mockResolvedValue(finalPatient);

      const result = await service.enroll(dto, 'admin-1', UserRole.ADMIN);

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
      expect(cacheService.invalidateByPrefix).toHaveBeenCalledWith('dashboard:');
      expect(result).toBe(finalPatient);
    });

    it('throws NotFoundException and rolls back exactly once when the patient does not exist', async () => {
      mockFindOneByEntity(null, buildProgram());

      await expect(service.enroll(dto as any, 'admin-1', UserRole.ADMIN)).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
      expect(cacheService.invalidateByPrefix).not.toHaveBeenCalled();
    });

    it('throws NotFoundException and rolls back when the program does not exist', async () => {
      mockFindOneByEntity(buildPatient(), null);

      await expect(service.enroll(dto as any, 'admin-1', UserRole.ADMIN)).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    });

    it('throws BadRequestException when the patient is already enrolled in the program', async () => {
      mockFindOneByEntity(buildPatient(), buildProgram(), { id: 'existing-enrollment' });

      await expect(service.enroll(dto as any, 'admin-1', UserRole.ADMIN)).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    });

    it('throws ForbiddenException when Healthcare Staff enrolls into a program they are not assigned to', async () => {
      const program = buildProgram({ assignedStaff: [{ id: 'other-staff' } as User] });
      mockFindOneByEntity(buildPatient(), program, null);

      await expect(service.enroll(dto as any, 'staff-1', UserRole.HEALTHCARE_STAFF)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    });

    it('allows Healthcare Staff to enroll into a program they are assigned to', async () => {
      const program = buildProgram({ assignedStaff: [{ id: 'staff-1' } as User] });
      mockFindOneByEntity(buildPatient(), program, null);
      mockQueryRunner.manager.create.mockImplementation((_entity: any, data: any) => data);
      jest.spyOn(service, 'findOne').mockResolvedValue(buildPatient());

      await expect(service.enroll(dto as any, 'staff-1', UserRole.HEALTHCARE_STAFF)).resolves.toBeDefined();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it('auto-assigns staff from the program assignedStaff list when no assignedStaffId is given', async () => {
      const program = buildProgram({ assignedStaff: [{ id: 'auto-staff' } as User] });
      mockFindOneByEntity(buildPatient(), program, null);
      mockQueryRunner.manager.create.mockImplementation((_entity: any, data: any) => data);
      jest.spyOn(service, 'findOne').mockResolvedValue(buildPatient());

      await service.enroll(dto, 'admin-1', UserRole.ADMIN);

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        PatientEnrollment,
        expect.objectContaining({ assignedStaffId: 'auto-staff' }),
      );
    });

    it('clears an explicit assignedStaffId supplied by non-Admin callers before auto-assigning', async () => {
      const program = buildProgram({ assignedStaff: [{ id: 'staff-1' } as User, { id: 'auto-staff' } as User] });
      mockFindOneByEntity(buildPatient(), program, null);
      mockQueryRunner.manager.create.mockImplementation((_entity: any, data: any) => data);
      jest.spyOn(service, 'findOne').mockResolvedValue(buildPatient());

      await service.enroll(
        { ...dto, assignedStaffId: 'someone-staff-tried-to-pick' },
        'staff-1',
        UserRole.HEALTHCARE_STAFF,
      );

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        PatientEnrollment,
        expect.objectContaining({ assignedStaffId: 'staff-1' }),
      );
    });

    it('does not call rollbackTransaction when the transaction is already inactive (double-rollback guard)', async () => {
      mockFindOneByEntity(null, buildProgram());
      // Simulate a queryRunner whose transaction already ended through some
      // other path before the outer catch runs: startTransaction still
      // resolves (the call succeeds) but leaves isTransactionActive false.
      mockQueryRunner.startTransaction.mockImplementationOnce(async () => {
        mockQueryRunner.isTransactionActive = false;
      });

      await expect(service.enroll(dto as any, 'admin-1', UserRole.ADMIN)).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('always releases the queryRunner, even when rollback occurs', async () => {
      mockFindOneByEntity(buildPatient(), buildProgram(), { id: 'existing' });

      await expect(service.enroll(dto as any, 'admin-1', UserRole.ADMIN)).rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('markProgramCompleted', () => {
    const buildEnrollment = (overrides: any = {}) => ({
      id: 'enrollment-1',
      patientId: 'patient-1',
      programId: 'program-1',
      isCompleted: false,
      assignedStaffId: 'staff-1',
      patient: buildPatient(),
      program: buildProgram(),
      ...overrides,
    });

    it('throws NotFoundException when the patient is not enrolled in the program', async () => {
      enrollmentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.markProgramCompleted('patient-1', 'program-1', 'notes', 'admin-1', UserRole.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when Healthcare Staff is not the assigned staff', async () => {
      enrollmentRepository.findOne.mockResolvedValue(buildEnrollment({ assignedStaffId: 'other-staff' }));

      await expect(
        service.markProgramCompleted('patient-1', 'program-1', 'notes', 'staff-1', UserRole.HEALTHCARE_STAFF),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when the program is already marked completed', async () => {
      enrollmentRepository.findOne.mockResolvedValue(buildEnrollment({ isCompleted: true }));

      await expect(
        service.markProgramCompleted('patient-1', 'program-1', 'notes', 'admin-1', UserRole.ADMIN),
      ).rejects.toThrow(BadRequestException);
    });

    it('marks the enrollment completed, logs the activity, and notifies on success', async () => {
      const enrollment = buildEnrollment();
      enrollmentRepository.findOne.mockResolvedValue(enrollment);
      enrollmentRepository.save.mockImplementation(async (e) => e as PatientEnrollment);

      const result = await service.markProgramCompleted(
        'patient-1',
        'program-1',
        'All sessions complete',
        'staff-1',
        UserRole.HEALTHCARE_STAFF,
      );

      expect(result.isCompleted).toBe(true);
      expect(result.completionNotes).toBe('All sessions complete');
      expect(result.endDate).toBeInstanceOf(Date);
      expect(activityLogsService.create).toHaveBeenCalled();
      expect(notificationsService.create).toHaveBeenCalled();
      expect(cacheService.invalidateByPrefix).toHaveBeenCalledWith('dashboard:');
    });
  });

  describe('nightlyRecomputeAllProgress', () => {
    /**
     * This is a scheduled batch job (`@Cron`), not something an HTTP
     * controller ever calls directly, so these tests invoke the method the
     * same way the NestJS scheduler would: directly, with no arguments.
     * The behavior worth locking down is the "one bad enrollment doesn't
     * abort the run" guarantee described in the method's own doc comment.
     */
    it('sequentially recomputes progress for every enrollment and completes without error when all succeed', async () => {
      enrollmentRepository.find.mockResolvedValueOnce([
        { id: 'enrollment-1' },
        { id: 'enrollment-2' },
      ] as PatientEnrollment[]);
      const recomputeSpy = jest.spyOn(service, 'recomputeProgress').mockResolvedValue(undefined);

      await service.nightlyRecomputeAllProgress();

      expect(enrollmentRepository.find).toHaveBeenCalledWith({ select: ['id'] });
      expect(recomputeSpy).toHaveBeenCalledTimes(2);
      expect(recomputeSpy).toHaveBeenNthCalledWith(1, 'enrollment-1');
      expect(recomputeSpy).toHaveBeenNthCalledWith(2, 'enrollment-2');
    });

    it('logs and continues past a single enrollment failure instead of aborting the whole run', async () => {
      enrollmentRepository.find.mockResolvedValueOnce([
        { id: 'enrollment-1' },
        { id: 'enrollment-2' },
        { id: 'enrollment-3' },
      ] as PatientEnrollment[]);
      const recomputeSpy = jest
        .spyOn(service, 'recomputeProgress')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('DB timeout for enrollment-2'))
        .mockResolvedValueOnce(undefined);

      await expect(service.nightlyRecomputeAllProgress()).resolves.toBeUndefined();

      // All three enrollments are still attempted despite the middle failure.
      expect(recomputeSpy).toHaveBeenCalledTimes(3);
    });
  });
});
