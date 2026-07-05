import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ProgramsService } from './programs.service';
import { Program, ProgramType, ProgramStatus, SessionFrequency } from '../../entities/program.entity';
import { Medication } from '../../entities/medication.entity';
import { User, UserRole } from '../../entities/user.entity';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ActivityType } from '../../entities/activity-log.entity';
import { CreateProgramDto } from './dto/create-program.dto';

/**
 * Unit coverage for ProgramsService, focused on the two places this service
 * makes data-integrity / access-control decisions itself rather than
 * delegating to a guard or the database schema:
 *
 *  1. `create()` cross-validates medication/program type compatibility and
 *     staff-role eligibility inside the service, via plain repository
 *     lookups rather than a foreign key or DB constraint — a regression
 *     here would silently let, e.g., a Diabetes medication attach to a
 *     Mental Health program, or let a non-Healthcare-Staff user be recorded
 *     as an assigned clinician.
 *  2. `findAll()` / `findOne()` implement Guest-role data minimization by
 *     hand: filtering to Active-status programs and deleting
 *     enrollment/patient-count fields *after* the query runs, rather than
 *     via a serialization-layer redaction rule. That makes it easy for a
 *     future edit to the query or field names to quietly stop stripping
 *     patient data from what is effectively a public endpoint, without any
 *     test failing — closing that gap is the point of these tests.
 *
 * All repositories are mocked with plain `jest.fn()`s per method the
 * service actually calls (no auto-mocking), and `createQueryBuilder()` is
 * stubbed as a chainable object per the codebase's established pattern, so
 * these tests run without Postgres and fail only on a genuine regression in
 * `ProgramsService`'s own logic.
 */
describe('ProgramsService', () => {
  let service: ProgramsService;
  let programRepository: jest.Mocked<Repository<Program>>;
  let medicationRepository: jest.Mocked<Repository<Medication>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let activityLogsService: { create: jest.Mock };

  const buildMedication = (overrides: Partial<Medication> = {}): Medication =>
    ({
      id: 'med-1',
      name: 'Metformin',
      dosage: '500mg',
      programType: undefined,
      ...overrides,
    }) as Medication;

  const buildStaff = (overrides: Partial<User> = {}): User =>
    ({
      id: 'staff-1',
      name: 'Nurse Joy',
      role: UserRole.HEALTHCARE_STAFF,
      ...overrides,
    }) as User;

  const buildProgram = (overrides: Partial<Program> = {}): Program =>
    ({
      id: 'prog-1',
      name: 'Diabetes Care',
      type: ProgramType.DIABETES,
      status: ProgramStatus.ACTIVE,
      sessionFrequency: SessionFrequency.WEEKLY,
      medications: [],
      assignedStaff: [],
      ...overrides,
    }) as Program;

  /**
   * TypeORM's QueryBuilder is fluent: every intermediate call returns
   * `this`, and only the terminal `get*` call resolves. A fresh chainable
   * stub is built per `createQueryBuilder()` call (rather than one shared
   * object reused across a whole test) because `findAll()` can invoke
   * `createQueryBuilder` twice within a single call — once to look up a
   * Healthcare Staff member's assigned program IDs, once for the main
   * paginated query — and each needs an independently configurable
   * terminal result.
   */
  const buildQueryBuilder = () => {
    const qb: Record<string, jest.Mock> = {};
    const chainable = [
      'select',
      'innerJoin',
      'leftJoinAndSelect',
      'where',
      'andWhere',
      'loadRelationCountAndMap',
      'orderBy',
      'skip',
      'take',
    ];
    chainable.forEach((method) => {
      qb[method] = jest.fn().mockReturnValue(qb);
    });
    qb.getRawMany = jest.fn();
    qb.getManyAndCount = jest.fn();
    qb.getOne = jest.fn();
    return qb;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgramsService,
        {
          provide: getRepositoryToken(Program),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Medication),
          useValue: {
            findBy: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findBy: jest.fn(),
          },
        },
        {
          provide: ActivityLogsService,
          useValue: { create: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(ProgramsService);
    programRepository = module.get(getRepositoryToken(Program));
    medicationRepository = module.get(getRepositoryToken(Medication));
    userRepository = module.get(getRepositoryToken(User));
    activityLogsService = module.get(ActivityLogsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const baseDto: CreateProgramDto = {
      name: 'Diabetes Care',
      type: ProgramType.DIABETES,
    };

    it("throws BadRequestException when an attached medication's programType does not match the program's type", async () => {
      const dto: CreateProgramDto = { ...baseDto, medicationIds: ['med-1'] };
      programRepository.create.mockReturnValue(buildProgram());
      medicationRepository.findBy.mockResolvedValue([
        buildMedication({ id: 'med-1', name: 'Insulin', programType: ProgramType.MENTAL_HEALTH }),
      ]);

      await expect(service.create(dto, 'user-1')).rejects.toThrow(BadRequestException);
      expect(programRepository.save).not.toHaveBeenCalled();
    });

    it('allows attaching a medication whose programType is unset (no category restriction)', async () => {
      const dto: CreateProgramDto = { ...baseDto, medicationIds: ['med-1'] };
      const program = buildProgram();
      programRepository.create.mockReturnValue(program);
      medicationRepository.findBy.mockResolvedValue([buildMedication({ id: 'med-1', programType: undefined })]);
      programRepository.save.mockResolvedValue({ ...program, id: 'prog-1' });
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'prog-1' } as any);

      await expect(service.create(dto, 'user-1')).resolves.toEqual({ id: 'prog-1' });
      expect(programRepository.save).toHaveBeenCalled();
    });

    it('throws BadRequestException when a supplied staff ID does not exist or is not Healthcare Staff', async () => {
      const dto: CreateProgramDto = { ...baseDto, staffIds: ['staff-1', 'staff-2'] };
      programRepository.create.mockReturnValue(buildProgram());
      // Only one of the two requested IDs comes back — simulates either a
      // missing user or one that exists but holds a non-Healthcare-Staff
      // role, since the repository call itself filters `role: HEALTHCARE_STAFF`
      // and a role mismatch and a missing ID are therefore indistinguishable
      // from the count alone (which is exactly what the service checks).
      userRepository.findBy.mockResolvedValue([buildStaff({ id: 'staff-1' })]);

      await expect(service.create(dto, 'user-1')).rejects.toThrow(BadRequestException);
      expect(programRepository.save).not.toHaveBeenCalled();
    });

    it('scopes the staff lookup to the Healthcare Staff role for the supplied IDs', async () => {
      const dto: CreateProgramDto = { ...baseDto, staffIds: ['staff-1'] };
      const program = buildProgram();
      programRepository.create.mockReturnValue(program);
      userRepository.findBy.mockResolvedValue([buildStaff({ id: 'staff-1' })]);
      programRepository.save.mockResolvedValue({ ...program, id: 'prog-1' });
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'prog-1' } as any);

      await service.create(dto, 'user-1');

      expect(userRepository.findBy).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.HEALTHCARE_STAFF }),
      );
    });

    it('persists the program, logs a PROGRAM activity entry, and returns the result of findOne', async () => {
      const program = buildProgram();
      programRepository.create.mockReturnValue(program);
      programRepository.save.mockResolvedValue({ ...program, id: 'prog-1' });
      const findOneResult = { id: 'prog-1', name: 'Diabetes Care' };
      jest.spyOn(service, 'findOne').mockResolvedValue(findOneResult as any);

      const result = await service.create(baseDto, 'user-1');

      expect(activityLogsService.create).toHaveBeenCalledWith(
        ActivityType.PROGRAM,
        expect.stringContaining('Diabetes Care'),
        'user-1',
        { programId: 'prog-1' },
      );
      expect(result).toBe(findOneResult);
    });
  });

  describe('findAll', () => {
    it('scopes Guest users to Active-status programs only, ignoring an explicit status filter', async () => {
      const qb = buildQueryBuilder();
      programRepository.createQueryBuilder.mockReturnValue(qb as any);
      qb.getManyAndCount.mockResolvedValue([[buildProgram({ status: ProgramStatus.ACTIVE })], 1]);

      await service.findAll({ status: 'Inactive' }, UserRole.GUEST, undefined);

      expect(qb.andWhere).toHaveBeenCalledWith('program.status = :status', { status: 'Active' });
      expect(qb.andWhere).not.toHaveBeenCalledWith('program.status = :status', { status: 'Inactive' });
      // Guests never get the enrollment-count aggregate computed for them.
      expect(qb.loadRelationCountAndMap).not.toHaveBeenCalled();
    });

    it('strips enrollment and patient-count fields from every program for Guest users', async () => {
      const qb = buildQueryBuilder();
      programRepository.createQueryBuilder.mockReturnValue(qb as any);
      const leakedProgram = buildProgram();
      // Simulates data that could end up on the entity (e.g. via a future
      // relation change) to prove the defensive strip actually deletes it,
      // rather than merely never having populated it in this test.
      (leakedProgram as any).enrollments = [{ id: 'enr-1' }];
      (leakedProgram as any).totalPatients = 12;
      qb.getManyAndCount.mockResolvedValue([[leakedProgram], 1]);

      const result = await service.findAll(undefined, UserRole.GUEST, undefined);

      expect(result.data[0]).not.toHaveProperty('enrollments');
      expect(result.data[0]).not.toHaveProperty('totalPatients');
    });

    it('includes the patient enrollment count and marks each assigned program for Healthcare Staff', async () => {
      const assignedQb = buildQueryBuilder();
      assignedQb.getRawMany.mockResolvedValue([{ id: 'prog-1' }]);
      const mainQb = buildQueryBuilder();
      mainQb.getManyAndCount.mockResolvedValue([
        [buildProgram({ id: 'prog-1' }), buildProgram({ id: 'prog-2' })],
        2,
      ]);
      programRepository.createQueryBuilder
        .mockReturnValueOnce(assignedQb as any)
        .mockReturnValueOnce(mainQb as any);

      const result = await service.findAll(undefined, UserRole.HEALTHCARE_STAFF, 'staff-1');

      expect(mainQb.loadRelationCountAndMap).toHaveBeenCalledWith('program.totalPatients', 'program.enrollments');
      expect((result.data[0] as any).isAssigned).toBe(true);
      expect((result.data[1] as any).isAssigned).toBe(false);
    });

    it('computes pagination metadata from the total count and the requested page size', async () => {
      const qb = buildQueryBuilder();
      programRepository.createQueryBuilder.mockReturnValue(qb as any);
      qb.getManyAndCount.mockResolvedValue([[buildProgram()], 25]);

      const result = await service.findAll({ page: 2, limit: 10 }, UserRole.ADMIN, undefined);

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(result.pagination).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
    });
  });

  describe('findOne', () => {
    it('restricts Guest users to Active-status programs and strips enrollment data', async () => {
      const qb = buildQueryBuilder();
      programRepository.createQueryBuilder.mockReturnValue(qb as any);
      const program = buildProgram({ status: ProgramStatus.ACTIVE });
      (program as any).enrollments = [{ id: 'enr-1' }];
      qb.getOne.mockResolvedValue(program);

      const result = await service.findOne('prog-1', UserRole.GUEST);

      expect(qb.andWhere).toHaveBeenCalledWith('program.status = :status', { status: 'Active' });
      // Guests never get the enrollments relation joined in the first place.
      expect(qb.leftJoinAndSelect).not.toHaveBeenCalledWith('program.enrollments', 'enrollments');
      expect(result).not.toHaveProperty('enrollments');
    });

    it('throws NotFoundException when no program matches the ID', async () => {
      const qb = buildQueryBuilder();
      programRepository.createQueryBuilder.mockReturnValue(qb as any);
      qb.getOne.mockResolvedValue(null);

      await expect(service.findOne('missing-id', UserRole.ADMIN)).rejects.toThrow(NotFoundException);
    });

    it('includes patient enrollments and does not filter by status for non-Guest roles', async () => {
      const qb = buildQueryBuilder();
      programRepository.createQueryBuilder.mockReturnValue(qb as any);
      const program = buildProgram();
      (program as any).enrollments = [{ id: 'enr-1' }];
      qb.getOne.mockResolvedValue(program);

      const result = await service.findOne('prog-1', UserRole.HEALTHCARE_STAFF);

      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('program.enrollments', 'enrollments');
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect((result as any).enrollments).toEqual([{ id: 'enr-1' }]);
    });
  });
});
