const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const docsRoot = __dirname;
const designPath = path.join(docsRoot, 'database-design.md');
const entitiesDir = path.join(root, 'entities');
const migrationsDir = path.join(root, 'migrations');
const migrationPath = path.join(migrationsDir, '1740000000000-CreateMaternityDomainTables.ts');

const skipTables = new Set(['users', 'inventories', 'inventory_transactions']);

const classNameOverrides = {
  faqs: 'Faq',
};

function pascalCase(value) {
  if (classNameOverrides[value]) return classNameOverrides[value];
  return value
    .split('_')
    .map((part) => {
      const singular = part.endsWith('ies')
        ? `${part.slice(0, -3)}y`
        : part.endsWith('s') && !part.endsWith('ss')
          ? part.slice(0, -1)
          : part;
      return singular.charAt(0).toUpperCase() + singular.slice(1);
    })
    .join('');
}

function camelCase(value) {
  return value.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

function parseTables(markdown) {
  const tables = [];
  const lines = markdown.split(/\r?\n/);
  let current = null;
  let inColumnTable = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const heading = line.match(/^### ([a-z][a-z0-9_]+)$/);
    if (heading) {
      current = {
        name: heading[1],
        columns: [],
        uniques: [],
      };
      if (!skipTables.has(current.name)) tables.push(current);
      inColumnTable = false;
      continue;
    }

    if (!current || skipTables.has(current.name)) continue;

    const unique = line.match(/^Unique:\s+`\(([^`]+)\)`\.$/i) || line.match(/^Unique:\s+`\(([^`]+)\)`$/i);
    if (unique) {
      current.uniques.push(unique[1].split(',').map((column) => column.trim()));
      continue;
    }

    if (/^\| Column \| Type \| Note \|$/.test(line)) {
      inColumnTable = true;
      i += 1;
      continue;
    }

    if (inColumnTable && line.startsWith('|')) {
      const parts = line.split('|').slice(1, -1).map((part) => part.trim());
      if (parts.length !== 3 || parts[0] === '---') continue;
      current.columns.push({
        name: parts[0],
        type: parts[1],
        note: parts[2],
      });
      continue;
    }

    if (inColumnTable && line.trim() === '') inColumnTable = false;
  }

  return tables.filter((table) => table.columns.length > 0);
}

function isPk(column) {
  return /\bPK\b/i.test(column.note);
}

function isNullable(column) {
  return /nullable/i.test(column.note);
}

function isUnique(column) {
  return /unique/i.test(column.note);
}

function defaultValue(column) {
  const match = column.note.match(/Default\s+([^,]+)/i);
  if (!match) return undefined;
  const value = match[1].trim();
  if (/^false$/i.test(value)) return false;
  if (/^true$/i.test(value)) return true;
  if (/^\d+$/.test(value)) return Number(value);
  return value.replace(/^`|`$/g, '');
}

function fkTarget(column) {
  const match = column.note.match(/FK ([a-z_]+)/i);
  if (!match) return undefined;
  return match[1];
}

function parseVarchar(type) {
  const match = type.match(/^varchar\((\d+)\)$/i);
  return match ? Number(match[1]) : undefined;
}

function parseDecimal(type) {
  const match = type.match(/^decimal\((\d+),\s*(\d+)\)$/i);
  return match ? { precision: Number(match[1]), scale: Number(match[2]) } : undefined;
}

function entityTsType(type) {
  if (/^bigint$/i.test(type)) return 'string';
  if (/^(int|boolean)$/i.test(type)) return 'number';
  if (/^decimal/i.test(type)) return 'string';
  if (/^(timestamp|datetime)$/i.test(type)) return 'Date';
  if (/^(date|time)$/i.test(type)) return 'string';
  if (/^json$/i.test(type)) return 'Record<string, unknown>';
  return 'string';
}

function columnDecoratorOptions(column) {
  const type = column.type.toLowerCase();
  const options = [];
  const propertyName = camelCase(column.name);
  if (propertyName !== column.name) options.push(`name: '${column.name}'`);

  const varcharLength = parseVarchar(type);
  const decimal = parseDecimal(type);

  if (varcharLength) {
    options.push(`type: 'varchar'`);
    options.push(`length: ${varcharLength}`);
  } else if (decimal) {
    options.push(`type: 'decimal'`);
    options.push(`precision: ${decimal.precision}`);
    options.push(`scale: ${decimal.scale}`);
  } else if (type === 'boolean') {
    options.push(`type: 'boolean'`);
  } else {
    options.push(`type: '${type}'`);
  }

  if (isNullable(column)) options.push('nullable: true');
  if (isUnique(column) && !isPk(column)) options.push('unique: true');

  const defaultVal = defaultValue(column);
  if (defaultVal !== undefined) {
    if (typeof defaultVal === 'boolean') options.push(`default: ${defaultVal}`);
    else if (typeof defaultVal === 'number') options.push(`default: ${defaultVal}`);
    else options.push(`default: '${defaultVal}'`);
  }

  return `{ ${options.join(', ')} }`;
}

function generateEntity(table) {
  const imports = new Set(['Column', 'Entity']);
  const className = pascalCase(table.name);
  const lines = [];

  lines.push(`@Entity('${table.name}')`);
  lines.push(`export class ${className} {`);

  for (const column of table.columns) {
    const propertyName = camelCase(column.name);
    const tsType = entityTsType(column.type);

    if (column.name === 'id' && isPk(column)) {
      imports.add('PrimaryGeneratedColumn');
      lines.push(`  @PrimaryGeneratedColumn({ type: 'bigint' })`);
      lines.push(`  ${propertyName}: ${tsType};`);
      lines.push('');
      continue;
    }

    if (column.name === 'created_at') {
      imports.add('CreateDateColumn');
      lines.push(`  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })`);
      lines.push(`  ${propertyName}: Date;`);
      lines.push('');
      continue;
    }

    if (column.name === 'updated_at') {
      imports.add('UpdateDateColumn');
      lines.push(`  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })`);
      lines.push(`  ${propertyName}: Date;`);
      lines.push('');
      continue;
    }

    if (isPk(column)) {
      imports.add('PrimaryColumn');
      lines.push(`  @PrimaryColumn(${columnDecoratorOptions(column)})`);
    } else {
      lines.push(`  @Column(${columnDecoratorOptions(column)})`);
    }

    lines.push(`  ${propertyName}: ${tsType};`);
    lines.push('');
  }

  lines.push('}');
  lines.push('');

  return `import {\n  ${Array.from(imports).sort().join(',\n  ')},\n} from 'typeorm';\n\n${lines.join('\n')}`;
}

function sqlType(column) {
  const type = column.type.toLowerCase();
  const varcharLength = parseVarchar(type);
  const decimal = parseDecimal(type);

  if (varcharLength) return `VARCHAR(${varcharLength})`;
  if (decimal) return `DECIMAL(${decimal.precision},${decimal.scale})`;
  if (type === 'bigint') return 'BIGINT';
  if (type === 'int') return 'INT';
  if (type === 'boolean') return 'TINYINT(1)';
  if (type === 'timestamp') return 'TIMESTAMP';
  if (type === 'datetime') return 'DATETIME';
  if (type === 'date') return 'DATE';
  if (type === 'time') return 'TIME';
  if (type === 'json') return 'JSON';
  if (type === 'longtext') return 'LONGTEXT';
  if (type === 'text') return 'TEXT';
  return type.toUpperCase();
}

function sqlDefault(column) {
  const value = defaultValue(column);
  if (value === undefined) return '';
  if (typeof value === 'boolean') return ` DEFAULT ${value ? 1 : 0}`;
  if (typeof value === 'number') return ` DEFAULT ${value}`;
  return ` DEFAULT '${value.replace(/'/g, "''")}'`;
}

function tableColumnType(column) {
  const type = column.type.toLowerCase();
  if (type === 'boolean') return 'tinyint';
  const varcharLength = parseVarchar(type);
  const decimal = parseDecimal(type);
  if (varcharLength) return 'varchar';
  if (decimal) return 'decimal';
  return type;
}

function tableColumnDefault(column) {
  const value = defaultValue(column);
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return String(value);
  return `'${value.replace(/'/g, "''")}'`;
}

function objectLiteral(entries, indent = 10) {
  const spaces = ' '.repeat(indent);
  const inner = entries.filter(Boolean).join(`,\n${spaces}`);
  return `{\n${spaces}${inner},\n${' '.repeat(indent - 2)}}`;
}

function generateTableColumnObject(column) {
  const type = column.type.toLowerCase();
  const varcharLength = parseVarchar(type);
  const decimal = parseDecimal(type);
  const entries = [
    `name: '${column.name}'`,
    `type: '${tableColumnType(column)}'`,
  ];

  if (varcharLength) entries.push(`length: '${varcharLength}'`);
  if (decimal) {
    entries.push(`precision: ${decimal.precision}`);
    entries.push(`scale: ${decimal.scale}`);
  }

  if (isPk(column)) entries.push('isPrimary: true');
  if (column.name === 'id' && isPk(column)) {
    entries.push('isGenerated: true');
    entries.push(`generationStrategy: 'increment'`);
  }
  if (isNullable(column)) entries.push('isNullable: true');

  const defaultVal = tableColumnDefault(column);
  if (column.name === 'created_at') entries.push(`default: 'CURRENT_TIMESTAMP'`);
  else if (column.name === 'updated_at') {
    entries.push(`default: 'CURRENT_TIMESTAMP'`);
    entries.push(`onUpdate: 'CURRENT_TIMESTAMP'`);
  } else if (defaultVal !== undefined) {
    entries.push(`default: ${defaultVal}`);
  }

  return objectLiteral(entries, 12);
}

function generateTableIndexObject(tableName, columns, unique = false) {
  const entries = [
    `name: '${constraintName(unique ? 'uq' : 'idx', tableName, columns)}'`,
    `columnNames: [${columns.map((column) => `'${column}'`).join(', ')}]`,
  ];
  if (unique) entries.push('isUnique: true');
  return objectLiteral(entries, 12);
}

function constraintName(prefix, table, columns) {
  const raw = `${prefix}_${table}_${columns.join('_')}`;
  return raw.length <= 60 ? raw : raw.slice(0, 52) + Math.abs(hashCode(raw)).toString(36).slice(0, 7);
}

function hashCode(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash << 5) - hash + value.charCodeAt(i);
  return hash;
}

function generateCreateTableCall(table) {
  const indices = [
    ...table.columns
      .filter((column) => isUnique(column) && !isPk(column))
      .map((column) => generateTableIndexObject(table.name, [column.name], true)),
    ...table.uniques.map((unique) => generateTableIndexObject(table.name, unique, true)),
  ];

  return `    await queryRunner.createTable(
      new Table({
        name: '${table.name}',
        columns: [
${table.columns.map((column) => `          ${generateTableColumnObject(column)}`).join(',\n')}
        ],${indices.length > 0 ? `\n        indices: [\n${indices.map((index) => `          ${index}`).join(',\n')}\n        ],` : ''}
      }),
      true,
    );`;
}

function generateForeignKeyObjects(table) {
  return table.columns
    .map((column) => {
      const target = fkTarget(column);
      if (!target) return undefined;
      return `      new TableForeignKey({
        name: '${constraintName('fk', table.name, [column.name])}',
        columnNames: ['${column.name}'],
        referencedTableName: '${target}',
        referencedColumnNames: ['id'],
        onDelete: '${isNullable(column) ? 'SET NULL' : 'CASCADE'}',
      })`;
    })
    .filter(Boolean);
}

function generateMigration(tables) {
  const createTableCalls = tables.map((table) => generateCreateTableCall(table));
  const foreignKeyCalls = tables
    .map((table) => {
      const foreignKeys = generateForeignKeyObjects(table);
      if (foreignKeys.length === 0) return undefined;
      return `    await queryRunner.createForeignKeys('${table.name}', [
${foreignKeys.join(',\n')}
    ]);`;
    })
    .filter(Boolean);
  const dropQueries = tables
    .slice()
    .reverse()
    .map((table) => `    await queryRunner.dropTable('${table.name}', true);`);

  return `import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';\n\nexport class CreateMaternityDomainTables1740000000000 implements MigrationInterface {\n  name = 'CreateMaternityDomainTables1740000000000';\n\n  public async up(queryRunner: QueryRunner): Promise<void> {\n${createTableCalls.join('\n\n')}\n\n${foreignKeyCalls.join('\n\n')}\n  }\n\n  public async down(queryRunner: QueryRunner): Promise<void> {\n${dropQueries.join('\n')}\n  }\n}\n`;
}

function writeFiles(tables) {
  fs.mkdirSync(entitiesDir, { recursive: true });

  for (const file of fs.readdirSync(entitiesDir)) {
    if (file.endsWith('.entity.ts') || file === 'index.ts') {
      fs.rmSync(path.join(entitiesDir, file), { force: true });
    }
  }

  const exports = [];
  for (const table of tables) {
    const className = pascalCase(table.name);
    const fileBase = table.name.replace(/_/g, '-');
    fs.writeFileSync(path.join(entitiesDir, `${fileBase}.entity.ts`), generateEntity(table), 'utf8');
    exports.push(`export { ${className} } from './${fileBase}.entity';`);
  }

  fs.writeFileSync(path.join(entitiesDir, 'index.ts'), `${exports.join('\n')}\n`, 'utf8');
  fs.writeFileSync(migrationPath, generateMigration(tables), 'utf8');
}

const markdown = fs.readFileSync(designPath, 'utf8');
const tables = parseTables(markdown);
writeFiles(tables);
console.log(`Generated ${tables.length} entities`);
console.log(`Generated migration ${migrationPath}`);
