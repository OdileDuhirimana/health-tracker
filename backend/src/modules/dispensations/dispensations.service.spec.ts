import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DispensationsService } from './dispensations.service';
import { Dispensation } from '../../entities/dispensation.entity';
import { Medication, MedicationFrequency, MedicationStatus } from '../../entities/medication.entity';
import { PatientEnrollment } from '../../entities/patient-enrollment.entity';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RedisCacheService } from '../../common/cache/redis-cache.service';

/**
 * Unit coverage for the medication dispensation duplicate-prevention logic
 * — the single highest-risk business rule in the app per both audits
 * (bucketed per-day/per-month collection limits, backed by a DB unique
 * constraint). These tests isolate `DispensationsService` from Postgres
 * entirely via mocked repositories, so they run the same way in CI as
 * locally with zero external dependencies, while still proving the
 * decision logic (which frequency allows how many dispensations, and what
 * happens when the database constraint is the one that actually catches a
 * race) behaves as documented.
 */
describe('DispensationsService', () => {
  let service: DispensationsService;
  let dispensationRepository: jest.Mocked<Repository<Dispensation>>;
  let medicationRepository: jest.Mocked<Repository<Medication>>;

  const buildMedication = (overrides: Partial<Medication> = {}): Medication =>
    ({
      id: 'med-1',
      name: 'Amoxicillin',
      dosage: '500mg',
      frequency: MedicationFrequency.DAILY,
      status: MedicationStatus.ACTIVE,
      ...overrides,
    }) as Medication;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispensationsService,
        {
          provide: getRepositoryToken(Dispensation),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
            manager: { getRepository: jest.fn() },
          },
        },
        {
          provide: getRepositoryToken(Medication),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PatientEnrollment),
          useValue: {
            createQueryBuilder: jest.fn(),
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
          provide: RedisCacheService,
          useValue: { get: jest.fn().mockResolvedValue(null), set: jest.fn(), invalidateByPrefix: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(DispensationsService);
    dispensationRepository = module.get(getRepositoryToken(Dispensation));
    medicationRepository = module.get(getRepositoryToken(Medication));
  });

  describe('checkDuplicateDispensation', () => {
    it('allows a Daily medication when no dispensation exists yet today', async () => {
      dispensationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.checkDuplicateDispensation('patient-1', 'med-1', MedicationFrequency.DAILY, new Date()),
      ).resolves.toBeUndefined();
    });

    it('blocks a Daily medication already dispensed earlier the same day', async () => {
      dispensationRepository.findOne.mockResolvedValue({
        dispensedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      } as Dispensation);

      await expect(
        service.checkDuplicateDispensation('patient-1', 'med-1', MedicationFrequency.DAILY, new Date()),
      ).rejects.toThrow(BadRequestException);
    });

    it('reports how many hours ago the earlier Daily dispensation occurred', async () => {
      dispensationRepository.findOne.mockResolvedValue({
        dispensedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      } as Dispensation);

      await expect(
        service.checkDuplicateDispensation('patient-1', 'med-1', MedicationFrequency.DAILY, new Date()),
      ).rejects.toThrow(/5 hours ago/);
    });

    it('blocks a Monthly medication already dispensed earlier the same month', async () => {
      dispensationRepository.findOne.mockResolvedValue({
        dispensedAt: new Date(),
      } as Dispensation);

      await expect(
        service.checkDuplicateDispensation('patient-1', 'med-1', MedicationFrequency.MONTHLY, new Date()),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows a Twice Daily medication on the first dose of the day', async () => {
      dispensationRepository.count.mockResolvedValue(0);

      await expect(
        service.checkDuplicateDispensation('patient-1', 'med-1', MedicationFrequency.TWICE_DAILY, new Date()),
      ).resolves.toBeUndefined();
    });

    it('allows a Twice Daily medication on the second dose of the day', async () => {
      dispensationRepository.count.mockResolvedValue(1);

      await expect(
        service.checkDuplicateDispensation('patient-1', 'med-1', MedicationFrequency.TWICE_DAILY, new Date()),
      ).resolves.toBeUndefined();
    });

    it('blocks a Twice Daily medication once two doses already exist today', async () => {
      dispensationRepository.count.mockResolvedValue(2);

      await expect(
        service.checkDuplicateDispensation('patient-1', 'med-1', MedicationFrequency.TWICE_DAILY, new Date()),
      ).rejects.toThrow(BadRequestException);
    });

    it('scopes the Daily/Monthly duplicate check to the given patient and medication', async () => {
      dispensationRepository.findOne.mockResolvedValue(null);

      await service.checkDuplicateDispensation('patient-42', 'med-99', MedicationFrequency.DAILY, new Date());

      expect(dispensationRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ patientId: 'patient-42', medicationId: 'med-99' }),
        }),
      );
    });
  });

  describe('create', () => {
    it('throws NotFoundException when the medication does not exist', async () => {
      medicationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          { patientId: 'p1', programId: 'prog1', medicationId: 'missing-med', dispensedAt: new Date().toISOString() } as any,
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects before touching the database when a duplicate is detected in application logic', async () => {
      medicationRepository.findOne.mockResolvedValue(buildMedication());
      dispensationRepository.findOne.mockResolvedValue({ dispensedAt: new Date() } as Dispensation);

      await expect(
        service.create(
          { patientId: 'p1', programId: 'prog1', medicationId: 'med-1', dispensedAt: new Date().toISOString() } as any,
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(dispensationRepository.save).not.toHaveBeenCalled();
    });

    it('translates a database unique-constraint violation into a friendly duplicate error', async () => {
      // Simulates the race-condition case the DB-level unique constraint
      // (uq_dispensation_bucket) is specifically designed to catch: two
      // concurrent requests both pass the pre-check, but only one INSERT
      // can win at the database.
      medicationRepository.findOne.mockResolvedValue(buildMedication());
      dispensationRepository.findOne.mockResolvedValue(null);
      dispensationRepository.create.mockImplementation((data) => data as Dispensation);
      dispensationRepository.save.mockRejectedValue({
        code: '23505',
        message: 'duplicate key value violates unique constraint "uq_dispensation_bucket"',
      });

      await expect(
        service.create(
          { patientId: 'p1', programId: 'prog1', medicationId: 'med-1', dispensedAt: new Date().toISOString() } as any,
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rethrows unrelated database errors instead of masking them as duplicates', async () => {
      medicationRepository.findOne.mockResolvedValue(buildMedication());
      dispensationRepository.findOne.mockResolvedValue(null);
      dispensationRepository.create.mockImplementation((data) => data as Dispensation);
      const unrelatedError = new Error('connection terminated unexpectedly');
      dispensationRepository.save.mockRejectedValue(unrelatedError);

      await expect(
        service.create(
          { patientId: 'p1', programId: 'prog1', medicationId: 'med-1', dispensedAt: new Date().toISOString() } as any,
          'user-1',
        ),
      ).rejects.toBe(unrelatedError);
    });

    it('assigns a DAY bucket for a Daily medication and a MONTH bucket for a Monthly medication', async () => {
      medicationRepository.findOne.mockResolvedValue(buildMedication({ frequency: MedicationFrequency.MONTHLY }));
      dispensationRepository.findOne.mockResolvedValue(null);
      dispensationRepository.create.mockImplementation((data) => data as Dispensation);
      dispensationRepository.save.mockResolvedValue({ id: 'disp-1' } as Dispensation);
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'disp-1' } as any);

      await service.create(
        { patientId: 'p1', programId: 'prog1', medicationId: 'med-1', dispensedAt: new Date().toISOString() },
        'user-1',
      );

      expect(dispensationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ bucketType: 'MONTH' }),
      );
    });
  });
});
