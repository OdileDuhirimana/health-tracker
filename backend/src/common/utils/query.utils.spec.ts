import { SelectQueryBuilder } from 'typeorm';
import { UserRole } from '../../entities/user.entity';
import { QueryUtils } from './query.utils';

/**
 * Builds a chainable mock that mimics the subset of TypeORM's
 * SelectQueryBuilder API these utility functions call. Every method
 * returns `this` so call chains like `.andWhere().skip().take()` behave
 * the same as the real builder, without needing a database connection.
 */
function createMockQueryBuilder(): jest.Mocked<SelectQueryBuilder<any>> {
  const mock: any = {
    innerJoin: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
  };
  return mock;
}

describe('QueryUtils', () => {
  describe('applyStaffFilter', () => {
    it('joins on patient_enrollments and filters by assignedStaffId for Healthcare Staff', () => {
      const query = createMockQueryBuilder();

      QueryUtils.applyStaffFilter(query, UserRole.HEALTHCARE_STAFF, 'staff-123', 'dispensation');

      expect(query.innerJoin).toHaveBeenCalledWith(
        'patient_enrollments',
        'enrollment',
        expect.stringContaining('dispensation.patientId'),
      );
      expect(query.andWhere).toHaveBeenCalledWith('enrollment.assignedStaffId = :userId', { userId: 'staff-123' });
    });

    it('does not filter for Admin', () => {
      const query = createMockQueryBuilder();

      QueryUtils.applyStaffFilter(query, UserRole.ADMIN, 'admin-1', 'patient');

      expect(query.innerJoin).not.toHaveBeenCalled();
      expect(query.andWhere).not.toHaveBeenCalled();
    });

    it('does not filter for Healthcare Staff when no userId is supplied', () => {
      const query = createMockQueryBuilder();

      QueryUtils.applyStaffFilter(query, UserRole.HEALTHCARE_STAFF, undefined, 'patient');

      expect(query.innerJoin).not.toHaveBeenCalled();
    });
  });

  describe('applyPagination', () => {
    it('applies skip/take based on page and limit', () => {
      const query = createMockQueryBuilder();

      const { skip } = QueryUtils.applyPagination(query, 3, 20);

      expect(skip).toBe(40); // (page 3 - 1) * limit 20
      expect(query.skip).toHaveBeenCalledWith(40);
      expect(query.take).toHaveBeenCalledWith(20);
    });

    it('caps the limit at 100 even if a larger limit is requested', () => {
      const query = createMockQueryBuilder();

      QueryUtils.applyPagination(query, 1, 500);

      expect(query.take).toHaveBeenCalledWith(100);
    });

    it('defaults to page 1, limit 50 when not specified', () => {
      const query = createMockQueryBuilder();

      const { skip } = QueryUtils.applyPagination(query);

      expect(skip).toBe(0);
      expect(query.take).toHaveBeenCalledWith(50);
    });
  });

  describe('applySearch', () => {
    it('builds an ILIKE OR clause across the provided fields', () => {
      const query = createMockQueryBuilder();

      QueryUtils.applySearch(query, 'jane', ['patient.fullName', 'patient.email']);

      expect(query.andWhere).toHaveBeenCalledWith(
        '(patient.fullName ILIKE :search OR patient.email ILIKE :search)',
        { search: '%jane%' },
      );
    });

    it('is a no-op when the search term is empty', () => {
      const query = createMockQueryBuilder();

      QueryUtils.applySearch(query, '', ['patient.fullName']);

      expect(query.andWhere).not.toHaveBeenCalled();
    });

    it('is a no-op when no fields are provided', () => {
      const query = createMockQueryBuilder();

      QueryUtils.applySearch(query, 'jane', []);

      expect(query.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('buildPaginationResponse', () => {
    it('computes totalPages by rounding up', () => {
      expect(QueryUtils.buildPaginationResponse(101, 1, 50)).toEqual({
        page: 1,
        limit: 50,
        total: 101,
        totalPages: 3,
      });
    });

    it('returns 0 total pages when there are no records', () => {
      expect(QueryUtils.buildPaginationResponse(0, 1, 50)).toEqual({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
      });
    });
  });
});
