const fs = require('fs');
const path = require('path');

const root = __dirname;
const designPath = path.join(root, 'database-design.md');
const csvPath = path.join(root, 'database-sheet.csv');
const xlsxPath = path.join(root, 'database-sheet.xlsx');

const headers = [
  'Entity',
  'Attribute',
  'Data Type',
  'PK/FK',
  'Nullable',
  'Unique',
  'Default',
  'Validation / Constraint',
  'Retention',
  'Owner',
  'Notes',
];

const manualTables = {
  roles: [
    ['id', 'bigint', 'PK', 'No', 'No', 'auto_increment', 'Primary key', 'Until hard delete', 'System', 'Role/group of permissions.'],
    ['name', 'varchar(100)', '-', 'No', 'Yes', 'NULL', 'Unique role name', 'Until hard delete', 'System', 'Example: system_admin, facility_admin, doctor, staff, patient.'],
    ['guard_name', 'varchar(50)', '-', 'No', 'No', 'api', 'Auth guard namespace', 'Until hard delete', 'System', 'Default API guard.'],
    ['created_at', 'timestamp', '-', 'No', 'No', 'CURRENT_TIMESTAMP', 'Created timestamp', 'Until hard delete', 'System', 'Audit field.'],
    ['updated_at', 'timestamp', '-', 'No', 'No', 'CURRENT_TIMESTAMP', 'Auto update on change', 'Until hard delete', 'System', 'Audit field.'],
  ],
  permissions: [
    ['id', 'bigint', 'PK', 'No', 'No', 'auto_increment', 'Primary key', 'Until hard delete', 'System', 'Permission identifier.'],
    ['name', 'varchar(150)', '-', 'No', 'Yes', 'NULL', 'Unique permission name', 'Until hard delete', 'System', 'Example: appointments.create, facilities.update.'],
    ['guard_name', 'varchar(50)', '-', 'No', 'No', 'api', 'Auth guard namespace', 'Until hard delete', 'System', 'Default API guard.'],
    ['created_at', 'timestamp', '-', 'No', 'No', 'CURRENT_TIMESTAMP', 'Created timestamp', 'Until hard delete', 'System', 'Audit field.'],
    ['updated_at', 'timestamp', '-', 'No', 'No', 'CURRENT_TIMESTAMP', 'Auto update on change', 'Until hard delete', 'System', 'Audit field.'],
  ],
  user_roles: [
    ['user_id', 'bigint', 'PK/FK→users.id', 'No', 'No', 'NULL', 'Composite PK with role_id', 'Until role removed', 'System', 'Assigns a role to a user.'],
    ['role_id', 'bigint', 'PK/FK→roles.id', 'No', 'No', 'NULL', 'Composite PK with user_id', 'Until role removed', 'System', 'Assigned role.'],
  ],
  role_permissions: [
    ['role_id', 'bigint', 'PK/FK→roles.id', 'No', 'No', 'NULL', 'Composite PK with permission_id', 'Until permission removed', 'System', 'Role side of role-permission mapping.'],
    ['permission_id', 'bigint', 'PK/FK→permissions.id', 'No', 'No', 'NULL', 'Composite PK with role_id', 'Until permission removed', 'System', 'Permission side of role-permission mapping.'],
  ],
  refresh_tokens: [
    ['id', 'bigint', 'PK', 'No', 'No', 'auto_increment', 'Primary key', 'Until token expires/revoked', 'System', 'Refresh token record.'],
    ['user_id', 'bigint', 'FK→users.id', 'No', 'No', 'NULL', 'Must reference users.id', 'Until token expires/revoked', 'System', 'Token owner.'],
    ['token_hash', 'varchar(255)', '-', 'No', 'Yes', 'NULL', 'Store hash only, never raw token', 'Until token expires/revoked', 'System', 'Used for refresh and revoke.'],
    ['expires_at', 'timestamp', '-', 'No', 'No', 'NULL', 'Must be future date when issued', 'Until token expires/revoked', 'System', 'Token expiry.'],
    ['revoked_at', 'timestamp', '-', 'Yes', 'No', 'NULL', 'Nullable until logout/revoke', 'Until token expires/revoked', 'System', 'Set when token is revoked.'],
    ['created_at', 'timestamp', '-', 'No', 'No', 'CURRENT_TIMESTAMP', 'Created timestamp', 'Until token expires/revoked', 'System', 'Audit field.'],
  ],
  settings: [
    ['id', 'bigint', 'PK', 'No', 'No', 'auto_increment', 'Primary key', 'Until hard delete', 'System', 'Setting identifier.'],
    ['key', 'varchar(190)', '-', 'No', 'Yes', 'NULL', 'Unique setting key', 'Until hard delete', 'System', 'Example: appointment.reminder_minutes.'],
    ['value', 'text', '-', 'Yes', 'No', 'NULL', 'String/json-compatible value', 'Until hard delete', 'System', 'Setting value.'],
    ['type', 'varchar(50)', '-', 'No', 'No', 'string', 'Allowed value type', 'Until hard delete', 'System', 'Example: string, number, boolean, json.'],
    ['created_at', 'timestamp', '-', 'No', 'No', 'CURRENT_TIMESTAMP', 'Created timestamp', 'Until hard delete', 'System', 'Audit field.'],
    ['updated_at', 'timestamp', '-', 'No', 'No', 'CURRENT_TIMESTAMP', 'Auto update on change', 'Until hard delete', 'System', 'Audit field.'],
  ],
};

function purposeMap(markdown) {
  const map = {};
  const re = /^- `([^`]+)`: (.+)$/gm;
  let m;
  while ((m = re.exec(markdown))) {
    map[m[1]] = m[2].trim();
  }
  return map;
}

function normalizeType(type) {
  return type.replace(/\s+/g, ' ').trim();
}

function parseFk(attribute, note) {
  const fk = note.match(/FK ([a-z_]+)/i);
  if (!fk) return null;
  const targetTable = fk[1];
  if (attribute.endsWith('_id')) return `${targetTable}.id`;
  return targetTable;
}

function parsePkFk(attribute, note) {
  const isPk = /\bPK\b/i.test(note);
  const fkTarget = parseFk(attribute, note);
  if (isPk && fkTarget) return `PK/FK→${fkTarget}`;
  if (isPk) return 'PK';
  if (fkTarget) return `FK→${fkTarget}`;
  return '-';
}

function parseNullable(note) {
  if (/nullable/i.test(note)) return 'Yes';
  if (/PK/i.test(note)) return 'No';
  if (/Default/i.test(note)) return 'No';
  return 'No';
}

function parseUnique(note) {
  return /unique/i.test(note) ? 'Yes' : 'No';
}

function parseDefault(note, attribute) {
  const defaultMatch = note.match(/Default\s+([^,]+)/i);
  if (defaultMatch) return defaultMatch[1].trim();
  if (attribute === 'created_at') return 'CURRENT_TIMESTAMP';
  if (attribute === 'updated_at') return 'CURRENT_TIMESTAMP';
  if (/nullable/i.test(note)) return 'NULL';
  return 'NULL';
}

function parseConstraint(attribute, type, note, tableConstraints) {
  const constraints = [];
  if (/PK/i.test(note)) constraints.push('Primary key');
  if (/unique/i.test(note)) constraints.push('Unique');
  const fkTarget = parseFk(attribute, note);
  if (fkTarget) constraints.push(`Must reference ${fkTarget}`);
  if (/`([^`]+)`/.test(note)) {
    const values = [...note.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    constraints.push(`Allowed: ${values.join(', ')}`);
  }
  if (/varchar\((\d+)\)/i.test(type)) constraints.push(`Max length ${type.match(/varchar\((\d+)\)/i)[1]}`);
  if (attribute.endsWith('_at')) constraints.push('Timestamp');
  if (attribute.endsWith('_date')) constraints.push('Date');
  if (tableConstraints.length) constraints.push(tableConstraints.join('; '));
  return constraints.join('; ') || note || '-';
}

function ownerFor(entity) {
  if (/product|cart|inventor/.test(entity)) return 'Shop';
  if (/user_profiles|pregnancy|health_metrics|appointments|medical|prescription|medication|chat/.test(entity)) return 'User';
  return 'System';
}

function retentionFor(entity) {
  if (/medical|prescription|pregnancy|health_metrics/.test(entity)) return 'Medical retention policy / until legal expiry';
  if (/payments|orders|invoices|refunds/.test(entity)) return 'Accounting retention policy';
  if (/chat/.test(entity)) return 'Until conversation archived/deleted by policy';
  if (/cart/.test(entity)) return 'Until checkout/cart cleared';
  if (/appointment/.test(entity)) return 'Until appointment archive policy';
  return 'Until soft/hard delete';
}

function parseMarkdownTables(markdown) {
  const rows = [];
  const purposes = purposeMap(markdown);
  const lines = markdown.split(/\r?\n/);
  let currentEntity = null;
  let currentPurpose = '';
  let tableConstraints = [];
  let inColumnTable = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const heading = line.match(/^### ([a-z][a-z0-9_]+)$/);
    if (heading) {
      currentEntity = heading[1];
      currentPurpose = purposes[currentEntity] || '';
      tableConstraints = [];
      inColumnTable = false;
      continue;
    }

    if (!currentEntity) continue;

    const unique = line.match(/^Unique:\s+(.+)$/i);
    if (unique) tableConstraints.push(`Unique ${unique[1].trim()}`);

    if (/^\| Column \| Type \| Note \|$/.test(line)) {
      inColumnTable = true;
      i += 1;
      continue;
    }

    if (inColumnTable && line.startsWith('|')) {
      const parts = line.split('|').slice(1, -1).map((p) => p.trim());
      if (parts.length !== 3 || parts[0] === '---') continue;
      const [attribute, dataType, note] = parts;
      const pkFk = parsePkFk(attribute, note);
      rows.push([
        currentEntity,
        attribute,
        normalizeType(dataType),
        pkFk,
        parseNullable(note),
        parseUnique(note),
        parseDefault(note, attribute),
        parseConstraint(attribute, dataType, note, tableConstraints),
        retentionFor(currentEntity),
        ownerFor(currentEntity),
        currentPurpose || note || '',
      ]);
      continue;
    }

    if (inColumnTable && line.trim() === '') {
      inColumnTable = false;
    }
  }

  return rows;
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnName(index) {
  let n = index + 1;
  let name = '';
  while (n > 0) {
    const mod = (n - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    n = Math.floor((n - mod) / 26);
  }
  return name;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);
  return {
    time: (hours << 11) | (minutes << 5) | seconds,
    date: ((year - 1980) << 9) | (month << 5) | day,
  };
}

function zipStore(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = dosDateTime(new Date());

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = Buffer.from(entry.content, 'utf8');
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(now.time, 10);
    local.writeUInt16LE(now.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(now.time, 12);
    central.writeUInt16LE(now.date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);

    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function makeWorksheetXml(dataRows) {
  const allRows = [headers, ...dataRows];
  const maxCol = columnName(headers.length - 1);
  const maxRow = allRows.length;
  const rowsXml = allRows
    .map((row, rowIndex) => {
      const r = rowIndex + 1;
      const cells = row
        .map((value, colIndex) => {
          const ref = `${columnName(colIndex)}${r}`;
          return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
        })
        .join('');
      return `<row r="${r}">${cells}</row>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:${maxCol}${maxRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>
    <col min="1" max="1" width="24" customWidth="1"/>
    <col min="2" max="2" width="28" customWidth="1"/>
    <col min="3" max="3" width="20" customWidth="1"/>
    <col min="4" max="4" width="18" customWidth="1"/>
    <col min="5" max="7" width="14" customWidth="1"/>
    <col min="8" max="8" width="44" customWidth="1"/>
    <col min="9" max="9" width="28" customWidth="1"/>
    <col min="10" max="10" width="14" customWidth="1"/>
    <col min="11" max="11" width="64" customWidth="1"/>
  </cols>
  <sheetData>${rowsXml}</sheetData>
</worksheet>`;
}

function writeXlsx(dataRows) {
  const entries = [
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Database Sheet" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      content: makeWorksheetXml(dataRows),
    },
  ];

  fs.writeFileSync(xlsxPath, zipStore(entries));
}

const markdown = fs.readFileSync(designPath, 'utf8');
const rows = [];
Object.entries(manualTables).forEach(([entity, attrs]) => {
  attrs.forEach((attr) => rows.push([entity, ...attr]));
});
rows.push(...parseMarkdownTables(markdown));

const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\r\n');
fs.writeFileSync(csvPath, `\uFEFF${csv}`, 'utf8');
writeXlsx(rows);

console.log(`Generated ${rows.length} rows`);
console.log(csvPath);
console.log(xlsxPath);
