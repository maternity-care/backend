const fs = require('fs');
const path = require('path');

function findFiles(dir, filter, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, filter, fileList);
    } else if (filePath.endsWith(filter)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const entityFiles = findFiles('./src', '.entity.ts');
let csvContent = 'Entity,Attribute,Data Type,PK/FK,Nullable,Unique,Default,Validation / Constraint,Retention,Owner,Notes\n';

for (const file of entityFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  
  // Extract class name
  const classMatch = content.match(/class\s+([A-Za-z0-9_]+)/);
  if (!classMatch) continue;
  const entityName = classMatch[1];
  
  // Extract properties
  const lines = content.split('\n');
  let currentDecorators = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('@')) {
      currentDecorators.push(line);
    } else if (line.match(/^[a-zA-Z0-9_]+\??\s*:/) || (currentDecorators.length > 0 && line.match(/^[a-zA-Z0-9_]+\s*=/))) {
      // It's a property
      const propMatch = line.match(/^([a-zA-Z0-9_]+)\??\s*:?\s*([a-zA-Z0-9_<>]+)?/);
      if (propMatch) {
        const attrName = propMatch[1];
        let dataType = propMatch[2] || 'VARCHAR';
        
        let pkFk = '—';
        let nullable = 'No';
        let unique = 'No';
        let defaultVal = 'NULL';
        let constraint = '';
        
        const decoratorsStr = currentDecorators.join(' ');
        
        if (decoratorsStr.includes('@PrimaryGeneratedColumn')) {
          pkFk = 'PK';
          dataType = 'UUID';
        }
        if (decoratorsStr.includes('ManyToOne') || decoratorsStr.includes('OneToOne') || decoratorsStr.includes('JoinColumn')) {
          pkFk = 'FK';
        }
        if (decoratorsStr.includes('nullable: true') || line.includes('?')) {
          nullable = 'Yes';
        }
        if (decoratorsStr.includes('unique: true')) {
          unique = 'Yes';
        }
        if (decoratorsStr.includes('default:')) {
          const defMatch = decoratorsStr.match(/default:\s*([^,}\]]+)/);
          if (defMatch) defaultVal = defMatch[1].trim();
        }
        if (decoratorsStr.includes('@CreateDateColumn')) {
          dataType = 'TIMESTAMP';
          defaultVal = 'CURRENT_TIMESTAMP';
        }
        if (decoratorsStr.includes('@UpdateDateColumn')) {
          dataType = 'TIMESTAMP';
          defaultVal = 'CURRENT_TIMESTAMP';
        }
        if (decoratorsStr.includes('@DeleteDateColumn')) {
          dataType = 'TIMESTAMP';
          nullable = 'Yes';
        }
        
        // Map TS types to SQL types roughly
        if (dataType === 'string') dataType = 'VARCHAR';
        if (dataType === 'number') dataType = 'INT';
        if (dataType === 'boolean') dataType = 'BOOL';
        if (dataType === 'Date') dataType = 'TIMESTAMP';
        
        csvContent += `${entityName},${attrName},${dataType},${pkFk},${nullable},${unique},${defaultVal},${constraint},Until deleted,System,\n`;
      }
      currentDecorators = [];
    } else if (line === '' || line.startsWith('//')) {
      // ignore
    } else {
      currentDecorators = []; // reset if not a property
    }
  }
}

fs.writeFileSync('../data_dictionary.csv', csvContent);
console.log('CSV generated at ../data_dictionary.csv');
