import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationType } from '../../entities/notification.entity';
import { Dispensation } from '../../entities/dispensation.entity';

/**
 * Unit coverage for `NotificationsService` — one of the modules flagged by
 * the hiring-committee audit as shipped with zero unit tests despite a
 * green CI pipeline. Scope here is deliberately limited to the user-facing
 * CRUD surface (`create`, `findAll`, `getUnreadCount`, `markAsRead`,
 * `markAllAsRead`, `remove`): the query-shape decisions in `findAll` (the
 * `read` filter's three branches, and the `limit` default/cap that is this
 * endpoint's only defense against an unbounded per-user query since it
 * intentionally returns a bare array rather than a paginated envelope) are
 * exactly the kind of easy-to-silently-break logic that "CI is green" does
 * not actually verify. `generateOverdueMedicationNotifications` (the
 * dispensation-scanning batch job) is out of scope for this file and is not
 * exercised here.
 *
 * Both repositories are mocked so these tests run against pure in-memory
 * stubs — no Postgres, no TypeORM query execution — and assert only on
 * `NotificationsService`'s own branching and the shape of the calls it
 * makes to its repositories.
 */
describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepository: jest.Mocked<Repository<Notification>>;

  const buildNotification = (overrides: Partial<Notification> = {}): Notification =>
    ({
      id: 'notif-1',
      type: NotificationType.MEDICATION,
      title: 'Medication due',
      message: 'Amoxicillin is due for patient Jane Doe',
      read: false,
      link: '/patients/patient-1',
      userId: 'user-1',
      timestamp: new Date(),
      ...overrides,
    }) as Notification;

  // Chainable QueryBuilder stub used by `findAll`: every builder method
  // returns `this` except the terminal `getMany`, which resolves to
  // whatever the test configures.
  const createQueryBuilderMock = () => {
    const qb: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    return qb;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
            count: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          // NotificationsService also depends on the Dispensation repository
          // (used only by `generateOverdueMedicationNotifications`, which is
          // out of scope for this file), so it is provided as an unused stub
          // purely to satisfy the constructor.
          provide: getRepositoryToken(Dispensation),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(NotificationsService);
    notificationRepository = module.get(getRepositoryToken(Notification));
  });

  describe('create', () => {
    it('persists a notification built from the given type/title/message/userId/link', async () => {
      const created = buildNotification();
      notificationRepository.create.mockReturnValue(created);
      notificationRepository.save.mockResolvedValue(created);

      const result = await service.create(
        NotificationType.MEDICATION,
        'Medication due',
        'Amoxicillin is due for patient Jane Doe',
        'user-1',
        '/patients/patient-1',
      );

      expect(notificationRepository.create).toHaveBeenCalledWith({
        type: NotificationType.MEDICATION,
        title: 'Medication due',
        message: 'Amoxicillin is due for patient Jane Doe',
        userId: 'user-1',
        link: '/patients/patient-1',
        read: false,
      });
      expect(notificationRepository.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });

    it('always initializes a new notification as unread, regardless of caller input', async () => {
      const created = buildNotification({ link: undefined });
      notificationRepository.create.mockReturnValue(created);
      notificationRepository.save.mockResolvedValue(created);

      await service.create(NotificationType.ALERT, 'Alert', 'Something happened', 'user-2');

      expect(notificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ read: false, link: undefined }),
      );
    });
  });

  describe('findAll', () => {
    it('scopes the query to the given user and orders by most recent first', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([]);
      notificationRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('user-1');

      expect(notificationRepository.createQueryBuilder).toHaveBeenCalledWith('notification');
      expect(qb.where).toHaveBeenCalledWith('notification.userId = :userId', { userId: 'user-1' });
      expect(qb.orderBy).toHaveBeenCalledWith('notification.timestamp', 'DESC');
    });

    it('filters to read notifications only when read=true is requested', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([]);
      notificationRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('user-1', { read: true });

      expect(qb.andWhere).toHaveBeenCalledWith('notification.read = :read', { read: true });
    });

    it('filters to unread notifications only when read=false is requested', async () => {
      // false is a meaningful, explicit filter value here — it must not be
      // treated the same as "omitted" just because it is falsy.
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([]);
      notificationRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('user-1', { read: false });

      expect(qb.andWhere).toHaveBeenCalledWith('notification.read = :read', { read: false });
    });

    it('does not apply a read filter when the read flag is omitted', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([]);
      notificationRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('user-1');

      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('defaults the limit to 50 when none is supplied', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([]);
      notificationRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('user-1');

      expect(qb.limit).toHaveBeenCalledWith(50);
    });

    it('passes through a requested limit that is within the allowed range', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([]);
      notificationRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('user-1', { limit: 20 });

      expect(qb.limit).toHaveBeenCalledWith(20);
    });

    it('caps a requested limit above 100 down to 100', async () => {
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue([]);
      notificationRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('user-1', { limit: 500 });

      expect(qb.limit).toHaveBeenCalledWith(100);
    });

    it('returns the bare array from the query, not a { data, pagination } envelope', async () => {
      const notifications = [buildNotification(), buildNotification({ id: 'notif-2' })];
      const qb = createQueryBuilderMock();
      qb.getMany.mockResolvedValue(notifications);
      notificationRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll('user-1');

      expect(result).toBe(notifications);
      expect(result).not.toHaveProperty('pagination');
      expect(result).not.toHaveProperty('data');
    });
  });

  describe('getUnreadCount', () => {
    it('returns the repository count of unread notifications for the given user', async () => {
      notificationRepository.count.mockResolvedValue(7);

      const result = await service.getUnreadCount('user-1');

      expect(notificationRepository.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
      });
      expect(result).toBe(7);
    });
  });

  describe('markAsRead', () => {
    it('marks a notification owned by the user as read and persists it', async () => {
      const notification = buildNotification({ read: false });
      notificationRepository.findOne.mockResolvedValue(notification);
      notificationRepository.save.mockImplementation(async (entity) => entity as Notification);

      const result = await service.markAsRead('notif-1', 'user-1');

      expect(notificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
      });
      expect(notificationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'notif-1', read: true }),
      );
      expect(result).toEqual(expect.objectContaining({ read: true }));
    });

    it('returns null without saving when no matching notification is found', async () => {
      notificationRepository.findOne.mockResolvedValue(null);

      const result = await service.markAsRead('missing-id', 'user-1');

      expect(result).toBeNull();
      expect(notificationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('bulk-updates every unread notification for the user and returns a confirmation message', async () => {
      notificationRepository.update.mockResolvedValue({ affected: 3 } as any);

      const result = await service.markAllAsRead('user-1');

      expect(notificationRepository.update).toHaveBeenCalledWith(
        { userId: 'user-1', read: false },
        { read: true },
      );
      expect(result).toEqual({ message: 'All notifications marked as read' });
    });

    it('returns the same confirmation message even when no notifications were unread', async () => {
      // The endpoint reports success unconditionally rather than the
      // affected-row count — this test locks in that this is a deliberate
      // "already up to date" response, not a sign the update silently failed.
      notificationRepository.update.mockResolvedValue({ affected: 0 } as any);

      const result = await service.markAllAsRead('user-1');

      expect(result).toEqual({ message: 'All notifications marked as read' });
    });
  });

  describe('remove', () => {
    it('deletes a notification owned by the user and returns a confirmation message', async () => {
      const notification = buildNotification();
      notificationRepository.findOne.mockResolvedValue(notification);
      notificationRepository.remove.mockResolvedValue(notification);

      const result = await service.remove('notif-1', 'user-1');

      expect(notificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
      });
      expect(notificationRepository.remove).toHaveBeenCalledWith(notification);
      expect(result).toEqual({ message: 'Notification removed' });
    });

    it('returns null without deleting when no matching notification is found', async () => {
      notificationRepository.findOne.mockResolvedValue(null);

      const result = await service.remove('missing-id', 'user-1');

      expect(result).toBeNull();
      expect(notificationRepository.remove).not.toHaveBeenCalled();
    });
  });
});
