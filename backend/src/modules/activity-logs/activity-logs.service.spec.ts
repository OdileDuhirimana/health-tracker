import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLog, ActivityType } from '../../entities/activity-log.entity';
import { User } from '../../entities/user.entity';

/**
 * Unit coverage for `ActivityLogsService` — the audit trail every other
 * feature module (dispensations, enrollments, notifications, auth, ...)
 * writes into. Two things make this file worth testing in isolation from
 * Postgres:
 *
 *  1. `findAll` builds its WHERE clause and pagination math by hand via
 *     `createQueryBuilder` rather than a declarative `find()` options
 *     object, so a typo in a column name or an off-by-one in `skip`/`take`
 *     would silently return the wrong page of results with no compiler
 *     help. Mocking the query builder as a chainable stub lets us assert
 *     exactly which clauses are added for which filter combinations
 *     without needing a real database.
 *  2. The response mapping flattens the joined `activity.user` relation
 *     into top-level `user` (name) and `userEmail` fields for the admin
 *     activity feed UI. Because the relation is a LEFT JOIN, `user` can be
 *     absent for a log whose author has since been deleted — that
 *     null-safety branch is exercised explicitly below.
 */
describe('ActivityLogsService', () => {
  let service: ActivityLogsService;
  let activityLogRepository: jest.Mocked<Repository<ActivityLog>>;

  /**
   * Minimal chainable stub for TypeORM's `SelectQueryBuilder`. Every
   * builder method used by the service (`leftJoinAndSelect`, `orderBy`,
   * `andWhere`, `skip`, `take`) returns the same mock object so calls can
   * be chained exactly as the real query builder allows; only the
   * terminal `getManyAndCount` resolves to the configured result tuple.
   */
  const createQueryBuilderMock = (
    result: [ActivityLog[], number] = [[], 0],
  ): jest.Mocked<SelectQueryBuilder<ActivityLog>> => {
    const qb: Partial<jest.Mocked<SelectQueryBuilder<ActivityLog>>> = {};
    qb.leftJoinAndSelect = jest.fn().mockReturnValue(qb);
    qb.orderBy = jest.fn().mockReturnValue(qb);
    qb.andWhere = jest.fn().mockReturnValue(qb);
    qb.skip = jest.fn().mockReturnValue(qb);
    qb.take = jest.fn().mockReturnValue(qb);
    qb.getManyAndCount = jest.fn().mockResolvedValue(result);
    return qb as jest.Mocked<SelectQueryBuilder<ActivityLog>>;
  };

  const buildUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      ...overrides,
    }) as User;

  const buildActivityLog = (overrides: Partial<ActivityLog> = {}): ActivityLog =>
    ({
      id: 'log-1',
      type: ActivityType.MEDICATION,
      description: 'Dispensed Amoxicillin',
      userId: 'user-1',
      user: buildUser(),
      metadata: { medicationId: 'med-1' },
      timestamp: new Date('2026-01-01T10:00:00.000Z'),
      ...overrides,
    });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogsService,
        {
          provide: getRepositoryToken(ActivityLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ActivityLogsService);
    activityLogRepository = module.get(getRepositoryToken(ActivityLog));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates and persists an activity log with the given type, description, userId, and metadata', async () => {
      const created = buildActivityLog();
      activityLogRepository.create.mockReturnValue(created);
      activityLogRepository.save.mockResolvedValue(created);

      const result = await service.create(
        ActivityType.MEDICATION,
        'Dispensed Amoxicillin',
        'user-1',
        { medicationId: 'med-1' },
      );

      expect(activityLogRepository.create).toHaveBeenCalledWith({
        type: ActivityType.MEDICATION,
        description: 'Dispensed Amoxicillin',
        userId: 'user-1',
        metadata: { medicationId: 'med-1' },
      });
      expect(result).toBe(created);
    });

    it('persists the exact entity instance returned by repository.create, not a fresh object', async () => {
      const created = buildActivityLog({ id: 'log-2' });
      activityLogRepository.create.mockReturnValue(created);
      activityLogRepository.save.mockResolvedValue(created);

      await service.create(ActivityType.SESSION, 'User logged in', 'user-2');

      expect(activityLogRepository.save).toHaveBeenCalledWith(created);
    });

    it('supports creation without metadata (metadata is optional)', async () => {
      const created = buildActivityLog({ metadata: undefined });
      activityLogRepository.create.mockReturnValue(created);
      activityLogRepository.save.mockResolvedValue(created);

      await service.create(ActivityType.ENROLLMENT, 'Patient enrolled', 'user-3');

      expect(activityLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: undefined }),
      );
    });

    it('propagates a repository save failure instead of swallowing it', async () => {
      const created = buildActivityLog();
      activityLogRepository.create.mockReturnValue(created);
      const dbError = new Error('connection terminated unexpectedly');
      activityLogRepository.save.mockRejectedValue(dbError);

      await expect(
        service.create(ActivityType.USER, 'User updated', 'user-4'),
      ).rejects.toBe(dbError);
    });
  });

  describe('findAll', () => {
    it('joins the user relation, orders by timestamp descending, and applies no filters by default', async () => {
      const qb = createQueryBuilderMock([[], 0]);
      activityLogRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll();

      expect(activityLogRepository.createQueryBuilder).toHaveBeenCalledWith('activity');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('activity.user', 'user');
      expect(qb.orderBy).toHaveBeenCalledWith('activity.timestamp', 'DESC');
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('applies a type filter', async () => {
      const qb = createQueryBuilderMock([[], 0]);
      activityLogRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ type: ActivityType.MEDICATION });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith('activity.type = :type', {
        type: ActivityType.MEDICATION,
      });
    });

    it('applies a userId filter', async () => {
      const qb = createQueryBuilderMock([[], 0]);
      activityLogRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ userId: 'user-42' });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith('activity.userId = :userId', {
        userId: 'user-42',
      });
    });

    it('applies a date filter scoped to the calendar day', async () => {
      const qb = createQueryBuilderMock([[], 0]);
      activityLogRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ date: '2026-01-01' });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith('DATE(activity.timestamp) = :date', {
        date: '2026-01-01',
      });
    });

    it('applies a search filter across description, user name, and type as a wildcard ILIKE', async () => {
      const qb = createQueryBuilderMock([[], 0]);
      activityLogRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ search: 'amox' });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(activity.description ILIKE :search OR user.name ILIKE :search OR CAST(activity.type AS TEXT) ILIKE :search)',
        { search: '%amox%' },
      );
    });

    it('combines type, userId, date, and search filters together in a single query', async () => {
      const qb = createQueryBuilderMock([[], 0]);
      activityLogRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({
        type: ActivityType.ATTENDANCE,
        userId: 'user-7',
        date: '2026-02-14',
        search: 'clinic',
      });

      expect(qb.andWhere).toHaveBeenCalledTimes(4);
      expect(qb.andWhere).toHaveBeenNthCalledWith(1, 'activity.type = :type', {
        type: ActivityType.ATTENDANCE,
      });
      expect(qb.andWhere).toHaveBeenNthCalledWith(2, 'activity.userId = :userId', {
        userId: 'user-7',
      });
      expect(qb.andWhere).toHaveBeenNthCalledWith(3, 'DATE(activity.timestamp) = :date', {
        date: '2026-02-14',
      });
      expect(qb.andWhere).toHaveBeenNthCalledWith(
        4,
        '(activity.description ILIKE :search OR user.name ILIKE :search OR CAST(activity.type AS TEXT) ILIKE :search)',
        { search: '%clinic%' },
      );
    });

    it('defaults to page 1 with a limit of 50 (skip 0) when no pagination params are given', async () => {
      const qb = createQueryBuilderMock([[], 0]);
      activityLogRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll();

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(50);
      expect(result.pagination).toEqual({ page: 1, limit: 50, total: 0, totalPages: 0 });
    });

    it('computes skip from page and limit for a later page', async () => {
      const qb = createQueryBuilderMock([[buildActivityLog()], 45]);
      activityLogRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ page: 3, limit: 10 });

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(result.pagination).toEqual({ page: 3, limit: 10, total: 45, totalPages: 5 });
    });

    it('caps the limit at 100 even when a larger limit is requested', async () => {
      const qb = createQueryBuilderMock([[], 0]);
      activityLogRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ limit: 500 });

      expect(qb.take).toHaveBeenCalledWith(100);
      expect(result.pagination.limit).toBe(100);
    });

    it('rounds totalPages up when total is not an exact multiple of limit', async () => {
      const qb = createQueryBuilderMock([[], 21]);
      activityLogRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ limit: 20 });

      expect(result.pagination.totalPages).toBe(2);
    });

    it('flattens the joined user relation into top-level user (name) and userEmail fields', async () => {
      const log = buildActivityLog({
        user: buildUser({ name: 'Jane Doe', email: 'jane@example.com' }),
        timestamp: new Date('2026-03-05T08:30:00.000Z'),
      });
      const qb = createQueryBuilderMock([[log], 1]);
      activityLogRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll();

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: log.id,
        user: 'Jane Doe',
        userEmail: 'jane@example.com',
        createdAt: log.timestamp,
      });
    });

    it('maps user and userEmail to undefined when the log has no associated user', async () => {
      const log = buildActivityLog({ user: undefined });
      const qb = createQueryBuilderMock([[log], 1]);
      activityLogRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll();

      expect(result.data[0].user).toBeUndefined();
      expect(result.data[0].userEmail).toBeUndefined();
    });

    it('preserves the log fields untouched by the mapping alongside the flattened user fields', async () => {
      const log = buildActivityLog({
        type: ActivityType.PROGRAM,
        description: 'Program updated',
        metadata: { programId: 'prog-1' },
      });
      const qb = createQueryBuilderMock([[log], 1]);
      activityLogRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll();

      expect(result.data[0]).toMatchObject({
        type: ActivityType.PROGRAM,
        description: 'Program updated',
        metadata: { programId: 'prog-1' },
      });
    });
  });
});
