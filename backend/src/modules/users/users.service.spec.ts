import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { UsersService } from './users.service';
import { User, UserRole, UserStatus } from '../../entities/user.entity';
import { Program, ProgramType, ProgramStatus, SessionFrequency } from '../../entities/program.entity';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// bcryptjs's CJS export can't be `jest.spyOn`'d directly in this environment
// ("Cannot redefine property"), so the whole module is mocked instead —
// mirrors the pattern established in auth.service.spec.ts.
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));
import * as bcrypt from 'bcryptjs';

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

/**
 * Unit coverage for `UsersService` — the module responsible for account
 * provisioning (including password hashing) and program-assignment for
 * Healthcare Staff. Every dependency (User repository, Program repository,
 * ActivityLogsService) is mocked so these tests exercise only the service's
 * own decision logic — duplicate-email rejection, conditional password
 * re-hashing, and the "programs only apply to Healthcare Staff" business
 * rule — without touching Postgres. This rule matters because a Guest or
 * Admin account silently accepting `programIds` would grant it implicit
 * program-scoped access it should never have; these tests exist to pin that
 * boundary down and catch a future regression before it reaches the RBAC
 * layer.
 */
describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<User>>;
  let programRepository: jest.Mocked<Repository<Program>>;
  let activityLogsService: jest.Mocked<ActivityLogsService>;

  const buildUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'hashed-password',
      role: UserRole.HEALTHCARE_STAFF,
      status: UserStatus.ACTIVE,
      assignedPrograms: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as User;

  const buildProgram = (overrides: Partial<Program> = {}): Program =>
    ({
      id: 'program-1',
      name: 'Diabetes Care',
      type: ProgramType.DIABETES,
      status: ProgramStatus.ACTIVE,
      sessionFrequency: SessionFrequency.WEEKLY,
      durationInDays: 90,
      ...overrides,
    }) as Program;

  // Chainable mock mirroring the QueryBuilder surface `findAll()` actually
  // calls: every intermediate method returns `this`, and the terminal
  // `getManyAndCount()` resolves the mocked page of results.
  const buildQueryBuilderMock = () => {
    const qb: Record<string, jest.Mock> = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };
    return qb;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
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
          useValue: {
            create: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    userRepository = module.get(getRepositoryToken(User));
    programRepository = module.get(getRepositoryToken(Program));
    activityLogsService = module.get(ActivityLogsService);
  });

  afterEach(() => {
    // clearAllMocks (not restoreAllMocks): the bcrypt functions are plain
    // jest.fn()s from the module factory above, not spies on a real
    // implementation, so there is nothing to "restore".
    jest.clearAllMocks();
  });

  describe('create', () => {
    const baseDto: CreateUserDto = {
      name: 'New User',
      email: 'new@example.com',
      password: 'PlainText123',
    };

    it('throws BadRequestException when the email is already registered', async () => {
      userRepository.findOne.mockResolvedValue(buildUser());

      await expect(service.create(baseDto, 'admin-1')).rejects.toThrow(BadRequestException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('hashes the password via bcrypt before persisting, never the plaintext', async () => {
      userRepository.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed-value' as never);
      userRepository.create.mockImplementation((data) => data as User);
      userRepository.save.mockResolvedValue(buildUser({ role: UserRole.GUEST, assignedPrograms: undefined }));

      await service.create({ ...baseDto, role: UserRole.GUEST }, 'admin-1');

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('PlainText123', 10);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'hashed-value' }),
      );
      // The persisted payload must carry the mocked hash's output, not the
      // caller-supplied plaintext password.
      const savedPayload = userRepository.save.mock.calls[0][0] as Partial<User>;
      expect(savedPayload.password).toBe('hashed-value');
      expect(savedPayload.password).not.toBe(baseDto.password);
    });

    it('strips the password field from the returned user', async () => {
      userRepository.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed-value' as never);
      userRepository.create.mockImplementation((data) => data as User);
      userRepository.save.mockResolvedValue(
        buildUser({ role: UserRole.GUEST, password: 'hashed-value', assignedPrograms: undefined }),
      );

      const result = await service.create({ ...baseDto, role: UserRole.GUEST }, 'admin-1');

      expect(result).not.toHaveProperty('password');
    });

    it('does not attempt program assignment for a non-Healthcare-Staff role, even when programIds is supplied', async () => {
      userRepository.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed-value' as never);
      userRepository.create.mockImplementation((data) => data as User);
      userRepository.save.mockResolvedValue(buildUser({ role: UserRole.GUEST, assignedPrograms: undefined }));

      await service.create({ ...baseDto, role: UserRole.GUEST, programIds: ['program-1'] }, 'admin-1');

      expect(programRepository.findBy).not.toHaveBeenCalled();
      // Only the initial save should occur — no second save to persist a
      // program assignment that was never attempted.
      expect(userRepository.save).toHaveBeenCalledTimes(1);
    });

    it('does not attempt program assignment for Healthcare Staff when programIds is omitted', async () => {
      userRepository.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed-value' as never);
      userRepository.create.mockImplementation((data) => data as User);
      userRepository.save.mockResolvedValue(buildUser({ role: UserRole.HEALTHCARE_STAFF }));

      await service.create(baseDto, 'admin-1');

      expect(programRepository.findBy).not.toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalledTimes(1);
    });

    it('assigns the resolved programs for Healthcare Staff when programIds is non-empty', async () => {
      userRepository.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed-value' as never);
      userRepository.create.mockImplementation((data) => data as User);
      const savedUser = buildUser({ role: UserRole.HEALTHCARE_STAFF, assignedPrograms: [] });
      userRepository.save.mockResolvedValue(savedUser);
      const program = buildProgram();
      programRepository.findBy.mockResolvedValue([program]);

      await service.create({ ...baseDto, role: UserRole.HEALTHCARE_STAFF, programIds: ['program-1'] }, 'admin-1');

      expect(programRepository.findBy).toHaveBeenCalledWith({ id: In(['program-1']) });
      expect(userRepository.save).toHaveBeenCalledTimes(2);
      // The second save persists the resolved program assignment.
      const secondSavePayload = userRepository.save.mock.calls[1][0] as User;
      expect(secondSavePayload.assignedPrograms).toEqual([program]);
    });

    it('clears assignedPrograms for Healthcare Staff when programIds is an empty array', async () => {
      userRepository.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed-value' as never);
      userRepository.create.mockImplementation((data) => data as User);
      userRepository.save.mockResolvedValue(buildUser({ role: UserRole.HEALTHCARE_STAFF }));

      await service.create({ ...baseDto, role: UserRole.HEALTHCARE_STAFF, programIds: [] }, 'admin-1');

      expect(programRepository.findBy).not.toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalledTimes(2);
      const secondSavePayload = userRepository.save.mock.calls[1][0] as User;
      expect(secondSavePayload.assignedPrograms).toEqual([]);
    });

    it('logs the user-creation activity with the acting admin and the new user id', async () => {
      userRepository.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed-value' as never);
      userRepository.create.mockImplementation((data) => data as User);
      const savedUser = buildUser({ id: 'new-user-1', role: UserRole.GUEST, assignedPrograms: undefined });
      userRepository.save.mockResolvedValue(savedUser);

      await service.create({ ...baseDto, role: UserRole.GUEST }, 'admin-1');

      expect(activityLogsService.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining(savedUser.name),
        'admin-1',
        expect.objectContaining({ userId: 'new-user-1', email: savedUser.email }),
      );
    });
  });

  describe('findAll', () => {
    it('applies default pagination (page 1, limit 50) and computes skip/totalPages from the result count', async () => {
      const qb = buildQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[buildUser()], 120]);
      userRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.findAll();

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(50);
      expect(result.pagination).toEqual({ page: 1, limit: 50, total: 120, totalPages: 3 });
    });

    it('computes skip as (page - 1) * limit for an arbitrary page/limit', async () => {
      const qb = buildQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      userRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.findAll(undefined, 3, 20);

      expect(qb.skip).toHaveBeenCalledWith(40);
      expect(qb.take).toHaveBeenCalledWith(20);
    });

    it('caps the effective limit at 100 even when a larger limit is requested', async () => {
      const qb = buildQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      userRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.findAll(undefined, 1, 500);

      expect(qb.take).toHaveBeenCalledWith(100);
      expect(result.pagination.limit).toBe(100);
    });

    it('applies an ILIKE name/email filter only when a search term is supplied', async () => {
      const qb = buildQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      userRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.findAll('jane');

      expect(qb.where).toHaveBeenCalledWith(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: '%jane%' },
      );
    });

    it('does not apply any where filter when no search term is supplied', async () => {
      const qb = buildQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      userRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.findAll();

      expect(qb.where).not.toHaveBeenCalled();
    });

    it('returns the resolved rows alongside the pagination metadata', async () => {
      const users = [buildUser({ id: 'a' }), buildUser({ id: 'b' })];
      const qb = buildQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([users, 2]);
      userRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.findAll();

      expect(result.data).toEqual(users);
      expect(result.pagination.totalPages).toBe(1);
    });
  });

  describe('update', () => {
    const baseDto: UpdateUserDto = { name: 'Updated Name' };

    it('throws NotFoundException when the target user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.update('missing-id', baseDto, 'admin-1')).rejects.toThrow(NotFoundException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('re-hashes the password only when a new one is supplied in the DTO', async () => {
      const user = buildUser();
      userRepository.findOne.mockResolvedValue(user);
      mockedBcrypt.hash.mockResolvedValue('new-hashed-password' as never);
      userRepository.save.mockImplementation(async (data) => data as User);

      await service.update('user-1', { password: 'NewPassword123' }, 'admin-1');

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('NewPassword123', 10);
      const savedPayload = userRepository.save.mock.calls[0][0] as User;
      expect(savedPayload.password).toBe('new-hashed-password');
    });

    it('leaves the stored password untouched when the DTO omits it', async () => {
      const user = buildUser({ password: 'original-hashed-password' });
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockImplementation(async (data) => data as User);

      await service.update('user-1', baseDto, 'admin-1');

      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
      const savedPayload = userRepository.save.mock.calls[0][0] as User;
      expect(savedPayload.password).toBe('original-hashed-password');
    });

    it('reassigns resolved programs when programIds is non-empty and the user is Healthcare Staff', async () => {
      const user = buildUser({ role: UserRole.HEALTHCARE_STAFF, assignedPrograms: [] });
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockImplementation(async (data) => data as User);
      const program = buildProgram({ id: 'program-2' });
      programRepository.findBy.mockResolvedValue([program]);

      await service.update('user-1', { programIds: ['program-2'] }, 'admin-1');

      expect(programRepository.findBy).toHaveBeenCalledWith({ id: In(['program-2']) });
      const savedPayload = userRepository.save.mock.calls[0][0] as User;
      expect(savedPayload.assignedPrograms).toEqual([program]);
    });

    it('clears assignedPrograms when programIds is non-empty but the user is not Healthcare Staff', async () => {
      const user = buildUser({ role: UserRole.GUEST, assignedPrograms: [buildProgram()] });
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockImplementation(async (data) => data as User);

      await service.update('user-1', { programIds: ['program-1'] }, 'admin-1');

      expect(programRepository.findBy).not.toHaveBeenCalled();
      const savedPayload = userRepository.save.mock.calls[0][0] as User;
      expect(savedPayload.assignedPrograms).toEqual([]);
    });

    it('clears assignedPrograms when programIds is an empty array', async () => {
      const user = buildUser({ role: UserRole.HEALTHCARE_STAFF, assignedPrograms: [buildProgram()] });
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockImplementation(async (data) => data as User);

      await service.update('user-1', { programIds: [] }, 'admin-1');

      expect(programRepository.findBy).not.toHaveBeenCalled();
      const savedPayload = userRepository.save.mock.calls[0][0] as User;
      expect(savedPayload.assignedPrograms).toEqual([]);
    });

    it('leaves the existing program assignment untouched when programIds is omitted', async () => {
      const existingPrograms = [buildProgram()];
      const user = buildUser({ role: UserRole.HEALTHCARE_STAFF, assignedPrograms: existingPrograms });
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockImplementation(async (data) => data as User);

      await service.update('user-1', baseDto, 'admin-1');

      expect(programRepository.findBy).not.toHaveBeenCalled();
      const savedPayload = userRepository.save.mock.calls[0][0] as User;
      expect(savedPayload.assignedPrograms).toEqual(existingPrograms);
    });

    it('strips the password field from the returned, updated user', async () => {
      const user = buildUser();
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockImplementation(async (data) => data as User);

      const result = await service.update('user-1', baseDto, 'admin-1');

      expect(result).not.toHaveProperty('password');
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the target user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('missing-id', 'admin-1')).rejects.toThrow(NotFoundException);
      expect(userRepository.remove).not.toHaveBeenCalled();
    });

    it('hard-deletes the user row and logs the activity when the user exists', async () => {
      const user = buildUser();
      userRepository.findOne.mockResolvedValue(user);
      userRepository.remove.mockResolvedValue(user);

      const result = await service.remove('user-1', 'admin-1');

      expect(userRepository.remove).toHaveBeenCalledWith(user);
      expect(activityLogsService.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining(user.name),
        'admin-1',
        expect.objectContaining({ userId: 'user-1' }),
      );
      expect(result).toEqual({ message: 'User deleted successfully' });
    });
  });
});
