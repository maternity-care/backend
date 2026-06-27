import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function paginate<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  options?: PaginationOptions,
): Promise<PaginationResult<T>> {
  const page = Math.max(1, Number(options?.page) || 1);
  const limit = Math.max(1, Number(options?.limit) || 20);

  const qb = query.skip((page - 1) * limit).take(limit);
  const [items, total] = await qb.getManyAndCount();

  const totalPages = Math.ceil(total / limit);

  return {
    items,
    total,
    page,
    limit,
    totalPages,
  };
}
