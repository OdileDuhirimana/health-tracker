import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MedicationsService } from './medications.service';
import { Medication, MedicationFrequency, MedicationStatus } from '../../entities/medication.entity';
import { Program, ProgramType } from '../../entities/program.entity';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ActivityType } from '../../entities/activity-log.entity';
import { UserRole } from '../../entities/user.entity';

/**
 * Unit coverage for `MedicationsService` — one of the modules the
 * hiring-committee audit flagged as untested despite a green CI pipeline.
 * These tests isolate the service from Postgres entirely via mocked
 * repositories (`Medication`, `Program`) and the `ActivityLogsService`
 * collaborator, so they exercise only this service's own branching logic:
 * the medication-ID sequence generator, the Healthcare-Staff-scoped vs.
 * Admin/unscoped `findAll` query paths, and the program-assignment handling
 * in `create`/`update`.
 *
 * As of the current source (`medications.service.ts`), the constructor only
 * takes `Medication`/`Program` repositories plus `ActivityLogsService` — no
 * cache layer (`RedisCacheService`) has been wired into this service yet,
 * unlike `PatientsService`/`DispensationsService` in this same codebase. If
 * that changes, the `beforeEach` below will need a matching provider.
 */
describe('MedicationsService', () => {
  let service: MedicationsService;
  let medicationRepository: jest.Mocked<Repository<Medication>>;
  let programRepository: jest.Mocked<Repository<Program>>;
  let activityLogsService: { create: jest.Mock };

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
    };
    return qb;
  };

  const buildMedication = (overrides: Partial<Medication> = {}): Medication =>
    ({
      id: 'med-1',
      name: 'Sertraline',
      dosage: '50mg',
      frequency: MedicationFrequency.DAILY,
      status: MedicationStatus.ACTIVE,
      medicationId: 'M-001',
      programs: [],
      ...overrides,
    }) as Medication;

  const buildProgram = (overrides: Partial<Program> = {}): Program =>
    ({
      id: 'program-1',
      name: 'Mental Health Outreach',
      type: ProgramType.MENTAL_HEALTH,
      ...overrides,
    }) as Program;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicationsService,
        {
          provide: getRepositoryToken(Medication),
          useValue: {
            createQueryBuilder: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Program),
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

    service = module.get(MedicationsService);
    medicationRepository = module.get(getRepositoryToken(Medication));
    programRepository = module.get(getRepositoryToken(Program));
    activityLogsService = module.get(ActivityLogsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateMedicationId', () => {
    it('starts the sequence at M-001 when no medication exists yet', async () => {
      const qb = createQueryBuilderMock();
      qb.getOne.mockResolvedValue(null);
      medicationRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(service.generateMedicationId()).resolves.toBe('M-001');
    });

    it('increments the zero-padded numeric suffix of the last generated medication ID', async () => {
      const qb = createQueryBuilderMock();
      qb.getOne.mockResolvedValue(buildMedication({ medicationId: 'M-005' }));
      medicationRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(service.generateMedicationId()).resolves.toBe('M-006');
    });

    it('does not truncate the suffix once the sequence outgrows 3 digits', async () => {
      // padStart(3, '0') only pads up to a minimum width — it must never
      // shorten a longer numeric string, so 999 -> 1000 stays 4 digits.
      const qb = createQueryBuilderMock();
      qb.getOne.mockResolvedValue(buildMedication({ medicationId: 'M-999' }));
      medicationRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(service.generateMedicationId()).resolves.toBe('M-1000');
    });
  });

  describe('findAll', () => {
    it('runs a single unscoped query with search applied for an Admin (or role-less) caller', async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[buildMedication()], 1]);
      medicationRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll('sert', 1, 50, UserRole.ADMIN, 'admin-1');

      expect(medicationRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%sert%' },
      );
      expect(qb.getManyAndCount).toHaveBeenCalled();
      expect(qb.getMany).not.toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.pagination).toEqual({ page: 1, limit: 50, total: 1, totalPages: 1 });
    });

    it('scopes results to the Healthcare Staff member via a program-membership subquery', async () => {
      // Regression test for a fixed bug: this branch used to destructure
      // the result as `const [data] = await query....getMany()`, which
      // unpacks only the *first array element* into `data` instead of the
      // array itself (`getMany()` doesn't return a `[data, count]` tuple the
      // way `getManyAndCount()` does). A Healthcare Staff user with more
      // than one matching medication would silently see just one. Now
      // fixed to `const data = await query....getMany()` — this test
      // asserts the corrected, full-array behavior.
      const firstMedication = buildMedication({ id: 'med-1' });
      const mainQb = createQueryBuilderMock();
      mainQb.getMany.mockResolvedValue([firstMedication, buildMedication({ id: 'med-2' })]);
      const subQb = createQueryBuilderMock();
      subQb.getRawMany.mockResolvedValue([{ id: 'med-1' }, { id: 'med-2' }]);
      medicationRepository.createQueryBuilder
        .mockReturnValueOnce(mainQb)
        .mockReturnValueOnce(subQb);

      const result = await service.findAll(undefined, 1, 50, UserRole.HEALTHCARE_STAFF, 'staff-1');

      expect(subQb.innerJoin).toHaveBeenNthCalledWith(
        1,
        'program_medications',
        'pm',
        'pm.medicationsId = medication.id',
      );
      expect(subQb.innerJoin).toHaveBeenNthCalledWith(
        2,
        'user_programs',
        'up',
        'up.programsId = pm.programsId',
      );
      expect(subQb.where).toHaveBeenCalledWith('up.usersId = :userId', { userId: 'staff-1' });
      expect(mainQb.andWhere).toHaveBeenCalledWith('medication.id IN (:...medicationIds)', {
        medicationIds: ['med-1', 'med-2'],
      });
      expect(mainQb.getMany).toHaveBeenCalled();
      expect(mainQb.getManyAndCount).not.toHaveBeenCalled();
      expect(result.pagination.total).toBe(2);
      expect(result.data).toEqual([firstMedication, buildMedication({ id: 'med-2' })]);
    });

    it('applies the search filter inside the Healthcare Staff subquery, not the main query', async () => {
      const mainQb = createQueryBuilderMock();
      mainQb.getMany.mockResolvedValue([buildMedication()]);
      const subQb = createQueryBuilderMock();
      subQb.getRawMany.mockResolvedValue([{ id: 'med-1' }]);
      medicationRepository.createQueryBuilder
        .mockReturnValueOnce(mainQb)
        .mockReturnValueOnce(subQb);

      await service.findAll('amox', 1, 50, UserRole.HEALTHCARE_STAFF, 'staff-1');

      expect(subQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%amox%' },
      );
      // The main query only narrows by the resolved ID list, never re-applies
      // the free-text search — the subquery already did that filtering.
      expect(mainQb.andWhere).toHaveBeenCalledWith('medication.id IN (:...medicationIds)', {
        medicationIds: ['med-1'],
      });
      expect(mainQb.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.anything(),
      );
    });

    it('short-circuits with an empty page when the Healthcare Staff member has no assigned medications', async () => {
      // The main query builder is constructed unconditionally before the
      // role check runs (unlike PatientsService.findAll, which builds its
      // subquery first and skips the main builder entirely on an empty
      // result) — so both createQueryBuilder calls happen here, but the
      // main builder's terminal methods must never be invoked once the
      // subquery already proves there is nothing to fetch.
      const mainQb = createQueryBuilderMock();
      const subQb = createQueryBuilderMock();
      subQb.getRawMany.mockResolvedValue([]);
      medicationRepository.createQueryBuilder
        .mockReturnValueOnce(mainQb)
        .mockReturnValueOnce(subQb);

      const result = await service.findAll(undefined, 1, 50, UserRole.HEALTHCARE_STAFF, 'staff-1');

      expect(result).toEqual({
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      });
      expect(medicationRepository.createQueryBuilder).toHaveBeenCalledTimes(2);
      expect(mainQb.getMany).not.toHaveBeenCalled();
      expect(mainQb.getManyAndCount).not.toHaveBeenCalled();
    });

    it('clamps an oversized page limit to the 100-item maximum', async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      medicationRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(undefined, 1, 500, UserRole.ADMIN, 'admin-1');

      expect(qb.take).toHaveBeenCalledWith(100);
      expect(result.pagination.limit).toBe(100);
    });
  });

  describe('create', () => {
    it('generates a medication ID, persists the medication with no programs, and logs the activity', async () => {
      jest.spyOn(service, 'generateMedicationId').mockResolvedValue('M-001');
      medicationRepository.create.mockImplementation((data) => data as Medication);
      const saved = buildMedication({ medicationId: 'M-001' });
      medicationRepository.save.mockResolvedValue(saved);
      medicationRepository.findOne.mockResolvedValue(saved);

      const result = await service.create(
        { name: 'Sertraline', dosage: '50mg', frequency: MedicationFrequency.DAILY },
        'user-1',
      );

      expect(medicationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ medicationId: 'M-001', status: MedicationStatus.ACTIVE }),
      );
      expect(programRepository.findBy).not.toHaveBeenCalled();
      expect(medicationRepository.save).toHaveBeenCalledTimes(1);
      expect(activityLogsService.create).toHaveBeenCalledWith(
        ActivityType.MEDICATION,
        expect.stringContaining('Sertraline'),
        'user-1',
        expect.objectContaining({ medicationId: saved.id }),
      );
      expect(result).toEqual(saved);
    });

    it('defaults status to Active when none is supplied', async () => {
      jest.spyOn(service, 'generateMedicationId').mockResolvedValue('M-001');
      medicationRepository.create.mockImplementation((data) => data as Medication);
      medicationRepository.save.mockResolvedValue(buildMedication());
      medicationRepository.findOne.mockResolvedValue(buildMedication());

      await service.create({ name: 'Sertraline', dosage: '50mg', frequency: MedicationFrequency.DAILY }, 'user-1');

      expect(medicationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: MedicationStatus.ACTIVE }),
      );
    });

    it('assigns the requested programs and persists the association with a second save', async () => {
      jest.spyOn(service, 'generateMedicationId').mockResolvedValue('M-001');
      const created = buildMedication({ programs: undefined });
      medicationRepository.create.mockReturnValue(created);
      medicationRepository.save.mockResolvedValue(created);
      const programs = [buildProgram({ id: 'program-1' }), buildProgram({ id: 'program-2' })];
      programRepository.findBy.mockResolvedValue(programs);
      medicationRepository.findOne.mockResolvedValue(buildMedication({ programs }));

      await service.create(
        {
          name: 'Sertraline',
          dosage: '50mg',
          frequency: MedicationFrequency.DAILY,
          programIds: ['program-1', 'program-2'],
        },
        'user-1',
      );

      expect(programRepository.findBy).toHaveBeenCalledWith({ id: expect.anything() });
      expect(medicationRepository.save).toHaveBeenCalledTimes(2);
      expect(medicationRepository.save).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ programs }),
      );
    });

    it('skips program lookup entirely when programIds is an empty array', async () => {
      jest.spyOn(service, 'generateMedicationId').mockResolvedValue('M-001');
      medicationRepository.create.mockImplementation((data) => data as Medication);
      medicationRepository.save.mockResolvedValue(buildMedication());
      medicationRepository.findOne.mockResolvedValue(buildMedication());

      await service.create(
        { name: 'Sertraline', dosage: '50mg', frequency: MedicationFrequency.DAILY, programIds: [] },
        'user-1',
      );

      expect(programRepository.findBy).not.toHaveBeenCalled();
      expect(medicationRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the medication does not exist', async () => {
      medicationRepository.findOne.mockResolvedValue(null);

      await expect(service.update('missing', {} as any, 'user-1')).rejects.toThrow(NotFoundException);
      expect(medicationRepository.save).not.toHaveBeenCalled();
    });

    it('replaces the assigned programs when a non-empty programIds list is supplied', async () => {
      const existing = buildMedication({ programs: [buildProgram({ id: 'old-program' })] });
      medicationRepository.findOne
        .mockResolvedValueOnce(existing) // lookup before update
        .mockResolvedValueOnce(buildMedication()); // this.findOne() at the end
      const newPrograms = [buildProgram({ id: 'new-program' })];
      programRepository.findBy.mockResolvedValue(newPrograms);
      medicationRepository.save.mockImplementation(async (m) => m as Medication);

      await service.update('med-1', { programIds: ['new-program'], name: 'Updated Name' }, 'user-1');

      expect(programRepository.findBy).toHaveBeenCalledWith({ id: expect.anything() });
      const savedArg = (medicationRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedArg.programs).toEqual(newPrograms);
      // The DTO's programIds must never survive onto the entity that is
      // persisted — it is not a column on Medication.
      expect(savedArg).not.toHaveProperty('programIds');
      expect(savedArg.name).toBe('Updated Name');
    });

    it('clears all program assignments when programIds is provided as an empty array', async () => {
      const existing = buildMedication({ programs: [buildProgram({ id: 'old-program' })] });
      medicationRepository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(buildMedication());
      medicationRepository.save.mockImplementation(async (m) => m as Medication);

      await service.update('med-1', { programIds: [] }, 'user-1');

      expect(programRepository.findBy).not.toHaveBeenCalled();
      const savedArg = (medicationRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedArg.programs).toEqual([]);
    });

    it('leaves existing program assignments untouched when programIds is not part of the update', async () => {
      const existingPrograms = [buildProgram({ id: 'kept-program' })];
      const existing = buildMedication({ programs: existingPrograms });
      medicationRepository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(buildMedication());
      medicationRepository.save.mockImplementation(async (m) => m as Medication);

      await service.update('med-1', { name: 'Renamed Only' }, 'user-1');

      expect(programRepository.findBy).not.toHaveBeenCalled();
      const savedArg = (medicationRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedArg.programs).toBe(existingPrograms);
      expect(savedArg.name).toBe('Renamed Only');
    });

    it('logs the activity and returns the freshly reloaded medication on success', async () => {
      const existing = buildMedication({ name: 'Old Name' });
      const reloaded = buildMedication({ name: 'New Name' });
      medicationRepository.findOne.mockResolvedValueOnce(existing).mockResolvedValueOnce(reloaded);
      medicationRepository.save.mockImplementation(async (m) => m as Medication);

      const result = await service.update('med-1', { name: 'New Name' }, 'user-1');

      expect(activityLogsService.create).toHaveBeenCalledWith(
        ActivityType.MEDICATION,
        expect.stringContaining('Updated medication'),
        'user-1',
        expect.objectContaining({ medicationId: existing.id }),
      );
      expect(result).toEqual(reloaded);
    });
  });
});
