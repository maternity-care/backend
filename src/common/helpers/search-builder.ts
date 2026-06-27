import { BadRequestException } from '@nestjs/common';
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export interface SearchBuilderOptions {
  /** Main-table fields clients are allowed to filter. */
  columns: readonly string[];
  /** relation name => allowed fields on that relation. */
  relations?: Readonly<Record<string, readonly string[]>>;
}

interface ParsedSearch {
  field: string;
  values: string[];
  contains: boolean;
}

function decodePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new BadRequestException('Invalid search encoding');
  }
}

export function parseSearch(searchTerm?: string): ParsedSearch[] {
  if (!searchTerm?.trim()) {
    return [];
  }

  return searchTerm
    .split('|')
    .map((pair): ParsedSearch | null => {
      const separator = pair.indexOf('=');
      if (separator < 1) {
        return null;
      }

      const field = decodePart(pair.slice(0, separator)).trim();
      let rawValue = pair.slice(separator + 1).trim();
      const isMulti = rawValue.startsWith('^');
      const contains = !isMulti && rawValue.startsWith('*');

      if (isMulti || contains) {
        rawValue = rawValue.slice(1);
      }

      const values = (isMulti ? rawValue.split(',') : [rawValue])
        .map((value) => decodePart(value).trim())
        .filter(Boolean);

      return field && values.length ? { field, values, contains } : null;
    })
    .filter((item): item is ParsedSearch => item !== null);
}

function safeAlias(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Applies the shared FE search syntax to a TypeORM query.
 *
 * Scalar: name=John
 * Contains: name=*John
 * Multi contains (OR): status=^active,pending
 * JSON path: metadata->city=*Ha%20Noi
 * Relation: facility,name=*Central
 */
export function searchBuilder<T extends ObjectLiteral>(
  builder: SelectQueryBuilder<T>,
  searchTerm: string | undefined,
  options: SearchBuilderOptions,
): SelectQueryBuilder<T> {
  const rootAlias = builder.alias;
  const allowedColumns = new Set(options.columns);
  const joinedRelations = new Map<string, string>();
  let parameterIndex = 0;

  for (const filter of parseSearch(searchTerm)) {
    const [relation, relationColumn, extra] = filter.field.split(',');

    if (relationColumn && !extra) {
      const allowedRelationColumns = options.relations?.[relation];
      if (!allowedRelationColumns?.includes(relationColumn)) {
        continue;
      }

      let alias = joinedRelations.get(relation);
      if (!alias) {
        alias = `search_${safeAlias(relation)}`;
        builder.leftJoin(`${rootAlias}.${relation}`, alias);
        joinedRelations.set(relation, alias);
      }

      applyCondition(builder, alias, relationColumn, filter, parameterIndex++);
      continue;
    }

    const [column, jsonPath, extraJsonPath] = filter.field.split('->');
    if (
      !allowedColumns.has(column) ||
      extraJsonPath ||
      (jsonPath !== undefined && !/^[a-zA-Z0-9_$.]+$/.test(jsonPath))
    ) {
      continue;
    }

    applyCondition(builder, rootAlias, column, filter, parameterIndex++, jsonPath);
  }

  return builder;
}

function applyCondition<T extends ObjectLiteral>(
  builder: SelectQueryBuilder<T>,
  alias: string,
  column: string,
  filter: ParsedSearch,
  index: number,
  jsonPath?: string,
): void {
  const driver = builder.connection.options.type;
  const field = jsonPath
    ? driver === 'postgres'
      ? `${alias}.${column}->>'${jsonPath.replace(/'/g, "''")}'`
      : `JSON_UNQUOTE(JSON_EXTRACT(${alias}.${column}, '$.${jsonPath.replace(/'/g, "''")}'))`
    : `${alias}.${column}`;

  if (filter.values.length > 1) {
    const conditions = filter.values.map((value, valueIndex) => {
      const parameter = `search_${index}_${valueIndex}`;
      builder.setParameter(parameter, `%${value}%`);
      return `${field} LIKE :${parameter}`;
    });
    builder.andWhere(`(${conditions.join(' OR ')})`);
    return;
  }

  const parameter = `search_${index}`;
  builder.andWhere(
    `${field} ${filter.contains ? 'LIKE' : '='} :${parameter}`,
    { [parameter]: filter.contains ? `%${filter.values[0]}%` : filter.values[0] },
  );
}
