import { SelectQueryBuilder } from 'typeorm';
import { UserRole } from '../../entities/user.entity';

export class QueryUtils {
  static applyStaffFilter<T>(
    query: SelectQueryBuilder<T>,
    userRole?: string,
    userId?: string,
    entityAlias: string = 'entity',
  ): SelectQueryBuilder<T> {
    if (userRole === UserRole.HEALTHCARE_STAFF && userId) {
      query
        .innerJoin(
          'patient_enrollments',
          'enrollment',
          `enrollment.patientId = ${entityAlias}.patientId AND enrollment.programId = ${entityAlias}.programId`,
        )
        .andWhere('enrollment.assignedStaffId = :userId', { userId });
    }
    return query;
  }

  static applyPagination<T>(
    query: SelectQueryBuilder<T>,
    page: number = 1,
    limit: number = 50,
  ): { query: SelectQueryBuilder<T>; skip: number } {
    const cappedLimit = Math.min(limit, 100);
    const skip = (page - 1) * cappedLimit;
    query.skip(skip).take(cappedLimit);
    return { query, skip };
  }

  static applySearch<T>(
    query: SelectQueryBuilder<T>,
    searchTerm: string,
    fields: string[],
  ): SelectQueryBuilder<T> {
    if (!searchTerm || fields.length === 0) return query;

    const conditions = fields.map((field) => `${field} ILIKE :search`).join(' OR ');
    query.andWhere(`(${conditions})`, { search: `%${searchTerm}%` });
    return query;
  }

  static buildPaginationResponse(total: number, page: number, limit: number) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}
